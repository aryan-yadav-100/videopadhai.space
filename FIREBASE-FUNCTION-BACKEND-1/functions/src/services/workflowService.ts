import * as admin from 'firebase-admin';
import { logger } from '../utils/logger.js';
import { saveWorkflow, saveFinalAnswer, getFinalAnswer } from './firestoreService.js';
import { sendToGPT } from './claude-llm.js';
import { sendToBackend2 } from './httpsservice.js';
import { prompt1, prompt2 } from '../prompt.js';
import { PerformanceTimer, measureAsync } from '../utils/middleware.js';
import { 
  recordWorkflowExecution,
  trackWorkflowActive,
  recordExternalApiCall 
} from '../utils/metrics.js';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Main workflow service
 */
export class WorkflowService {
  private userId: string;
  private traceId: string;

  constructor(userId: string, traceId?: string) {
    this.userId = userId;
    this.traceId = traceId || logger.generateTraceId();
  }

  /**
   * Process Workflow 1 and auto-trigger Workflow 2
   */
  async processWorkflow1(chatId: string, followUpAnswers: string[]) {
    const workflowTimer = new PerformanceTimer('workflow_1_complete', this.traceId);
    
    // Track active workflow
    trackWorkflowActive('1', true);
    
    try {
      logger.logWorkflowProgress(chatId, this.userId, 1, 'started', 'processing', this.traceId);
      
      // Save initial state
      await this.saveState(chatId, prompt1, 'processing', [], followUpAnswers);
      
      // Run workflow 1
      const finalAnswer1 = await this.runWorkflow(chatId, prompt1, followUpAnswers.join('\n\n'), '1');
      
      logger.logWorkflowProgress(chatId, this.userId, 1, 'completed', 'completed', this.traceId);
      
      // Auto-trigger Workflow 2
      logger.logInfo(
        { chatId, userId: this.userId, operation: 'workflow_2', step: 'triggering', traceId: this.traceId },
        'Auto-triggering Workflow 2'
      );
      
      const workflow2ChatId = `${chatId}_workflow2`;
      const finalAnswer2 = await this.processWorkflow2(workflow2ChatId, chatId);

      // Send HTTP POST request to Backend 2 after both workflows complete
      logger.logInfo(
        { chatId, userId: this.userId, operation: 'backend_2_request', traceId: this.traceId },
        'Both workflows completed, sending HTTP request to Backend 2'
      );

      try {
        await sendToBackend2(this.userId, chatId, this.traceId);
        
        logger.logInfo(
          { chatId, userId: this.userId, operation: 'backend_2_request', status: 'success', traceId: this.traceId },
          'HTTP request to Backend 2 successful'
        );

      } catch (httpError) {
        // Record failed external API call
        recordExternalApiCall('backend_2', 'post_workflow_complete', 'error');
        
        logger.logError({
          error: httpError,
          context: { chatId, userId: this.userId, operation: 'backend_2_request', traceId: this.traceId },
          message: 'Failed to send HTTP request to Backend 2, but workflows completed successfully'
        });
      }

      // Record successful workflow completion
      const duration = workflowTimer.end({ status: 'success' });
      recordWorkflowExecution('1', 'success', duration / 1000);
      
      return { finalAnswer1, finalAnswer2 };

    } catch (error) {
      await this.saveState(chatId, prompt1, 'failed', [], followUpAnswers);
      
      // Record failed workflow
      const duration = workflowTimer.end({ status: 'failed' });
      recordWorkflowExecution('1', 'failed', duration / 1000);
      
      logger.logError({
        error,
        context: { chatId, userId: this.userId, operation: 'workflow_1', traceId: this.traceId },
        message: 'Workflow 1 failed'
      });
      
      throw error;
    } finally {
      // Always decrement active workflows counter
      trackWorkflowActive('1', false);
    }
  }

  /**
   * Process Workflow 2
   */
  async processWorkflow2(newChatId: string, previousChatId: string): Promise<string> {
    const workflowTimer = new PerformanceTimer('workflow_2_complete', this.traceId);
    
    trackWorkflowActive('2', true);
    
    try {
      logger.logWorkflowProgress(newChatId, this.userId, 2, 'started', 'processing', this.traceId);
      
      const finalAnswer1 = await getFinalAnswer(previousChatId);
      if (!finalAnswer1) {
        throw new Error(`No final answer found for: ${previousChatId}`);
      }

      await this.saveState(newChatId, prompt2, 'processing', []);
      const finalAnswer2 = await this.runWorkflow(newChatId, prompt2, finalAnswer1, '2');
      
      logger.logWorkflowProgress(newChatId, this.userId, 2, 'completed', 'completed', this.traceId);
      
      // Record successful workflow completion
      const duration = workflowTimer.end({ status: 'success' });
      recordWorkflowExecution('2', 'success', duration / 1000);
      
      return finalAnswer2;
      
    } catch (error) {
      await this.saveState(newChatId, prompt2, 'failed', []);
      
      // Record failed workflow
      const duration = workflowTimer.end({ status: 'failed' });
      recordWorkflowExecution('2', 'failed', duration / 1000);
      
      logger.logError({
        error,
        context: { chatId: newChatId, userId: this.userId, operation: 'workflow_2', traceId: this.traceId },
        message: 'Workflow 2 failed'
      });
      
      throw error;
    } finally {
      trackWorkflowActive('2', false);
    }
  }

  /**
   * Run a single workflow (DRY helper)
   */
  private async runWorkflow(
    chatId: string, 
    prompt: string, 
    userAnswer: string, 
    workflowType: '1' | '2'
  ): Promise<string> {
    const messages: ChatMessage[] = [];
    
    // Step 1: Get follow-up question
    logger.logInfo(
      { chatId, userId: this.userId, operation: `workflow_${workflowType}`, step: 'gpt_call_1', traceId: this.traceId },
      'Sending first GPT request for follow-up question'
    );
    
    messages.push({ role: 'user', content: prompt });
    
    const followUpQuestion = await measureAsync(
      `gpt_call_followup_workflow_${workflowType}`,
      async () => {
        const startTime = Date.now();
        try {
          const result = await sendToGPT(messages);
          const duration = (Date.now() - startTime) / 1000;
          
          recordExternalApiCall('openai', 'get_followup_question', 'success', duration);
          
          logger.logExternalApiCall(
            'openai',
            'get_followup_question',
            { chatId, userId: this.userId, operation: `workflow_${workflowType}`, traceId: this.traceId },
            'success',
            Date.now() - startTime,
            { 
              promptLength: prompt.length,
              responseLength: result.length 
            }
          );
          
          return result;
        } catch (error) {
          const duration = (Date.now() - startTime) / 1000;
          recordExternalApiCall('openai', 'get_followup_question', 'error', duration);
          throw error;
        }
      },
      this.traceId
    );
    
    messages.push({ role: 'assistant', content: followUpQuestion });

    // Step 2: Get final answer
    logger.logInfo(
      { chatId, userId: this.userId, operation: `workflow_${workflowType}`, step: 'gpt_call_2', traceId: this.traceId },
      'Sending second GPT request for final answer'
    );
    
    messages.push({ role: 'user', content: userAnswer });
    
    const finalAnswer = await measureAsync(
      `gpt_call_final_answer_workflow_${workflowType}`,
      async () => {
        const startTime = Date.now();
        try {
          const result = await sendToGPT(messages);
          const duration = (Date.now() - startTime) / 1000;
          
          recordExternalApiCall('openai', 'get_final_answer', 'success', duration);
          
          logger.logExternalApiCall(
            'openai',
            'get_final_answer',
            { chatId, userId: this.userId, operation: `workflow_${workflowType}`, traceId: this.traceId },
            'success',
            Date.now() - startTime,
            { 
              messagesCount: messages.length,
              responseLength: result.length 
            }
          );
          
          return result;
        } catch (error) {
          const duration = (Date.now() - startTime) / 1000;
          recordExternalApiCall('openai', 'get_final_answer', 'error', duration);
          throw error;
        }
      },
      this.traceId
    );
    
    messages.push({ role: 'assistant', content: finalAnswer });

    // Save completed state
    await measureAsync(
      `firestore_save_workflow_${workflowType}`,
      async () => {
        const startTime = Date.now();
        try {
          await this.saveState(chatId, prompt, 'completed', messages);
          await saveFinalAnswer(chatId, this.userId, finalAnswer);
          
          const duration = (Date.now() - startTime) / 1000;
          recordExternalApiCall('firestore', 'save_workflow', 'success', duration);
        } catch (error) {
          const duration = (Date.now() - startTime) / 1000;
          recordExternalApiCall('firestore', 'save_workflow', 'error', duration);
          throw error;
        }
      },
      this.traceId
    );

    return finalAnswer;
  }

  /**
   * Save workflow state (DRY helper)
   */
  private async saveState(
    chatId: string, 
    prompt: string, 
    step: 'processing' | 'completed' | 'failed', 
    messages: ChatMessage[], 
    followUpAnswers?: string[]
  ) {
    const data = {
      chatId,
      ownerId: this.userId,
      prompt,
      followUpAnswers,
      step,
      messages,
      finalAnswer: step === 'completed' ? messages[messages.length - 1]?.content : undefined,
      traceId: this.traceId, // Add trace ID to stored data
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    };

    await saveWorkflow(chatId, this.userId, data);
  }
}
import * as admin from 'firebase-admin';
import { logger } from '../utils/logger.js';
import { saveWorkflow, saveFinalAnswer, getFinalAnswer } from './firestoreService.js';
import { sendToGPT } from './claude-llm.js';
import { sendToBackend2 } from './httpsservice.js'; // Updated import
import { prompt1, prompt2 } from '../prompt.js';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Main workflow service
 */
export class WorkflowService {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Process Workflow 1 and auto-trigger Workflow 2
   */
  async processWorkflow1(chatId: string, followUpAnswers: string[]) {
    try {
      // Save initial state
      await this.saveState(chatId, prompt1, 'processing', [], followUpAnswers);
      
      // Run workflow 1
      const finalAnswer1 = await this.runWorkflow(chatId, prompt1, followUpAnswers.join('\n\n'));
      
      // Auto-trigger Workflow 2
      const workflow2ChatId = `${chatId}_workflow2`;
      const finalAnswer2 = await this.processWorkflow2(workflow2ChatId, chatId);

      // Send HTTP POST request to Backend 2 after both workflows complete
      logger.logInfo(
        { chatId, userId: this.userId, operation: 'workflow_1' },
        'Both workflows completed, sending HTTP request to Backend 2'
      );

      try {
        await sendToBackend2(this.userId, chatId);
        
        logger.logInfo(
          { chatId, userId: this.userId, operation: 'workflow_1' },
          'HTTP request to Backend 2 successful'
        );

      } catch (httpError) {
        logger.logError({
          error: httpError,
          context: { chatId, userId: this.userId, operation: 'http_request' },
          message: 'Failed to send HTTP request to Backend 2, but workflows completed successfully'
        });
      }

      return { finalAnswer1, finalAnswer2 };

    } catch (error) {
      await this.saveState(chatId, prompt1, 'failed', [], followUpAnswers);
      logger.logError({
        error,
        context: { chatId, userId: this.userId, operation: 'workflow_1' },
        message: 'Workflow 1 failed'
      });
      throw error;
    }
  }

  /**
   * Process Workflow 2
   */
  async processWorkflow2(newChatId: string, previousChatId: string): Promise<string> {
    try {
      const finalAnswer1 = await getFinalAnswer(previousChatId);
      if (!finalAnswer1) throw new Error(`No final answer found for: ${previousChatId}`);

      await this.saveState(newChatId, prompt2, 'processing', []);
      const finalAnswer2 = await this.runWorkflow(newChatId, prompt2, finalAnswer1);
      return finalAnswer2;
    } catch (error) {
      await this.saveState(newChatId, prompt2, 'failed', []);
      throw error;
    }
  }

  /**
   * Run a single workflow (DRY helper)
   */
  private async runWorkflow(chatId: string, prompt: string, userAnswer: string): Promise<string> {
    const messages: ChatMessage[] = [];
    
    // Step 1: Get follow-up question
    messages.push({ role: 'user', content: prompt });
    const followUpQuestion = await sendToGPT(messages);
    messages.push({ role: 'assistant', content: followUpQuestion });

    // Step 2: Get final answer
    messages.push({ role: 'user', content: userAnswer });
    const finalAnswer = await sendToGPT(messages);
    messages.push({ role: 'assistant', content: finalAnswer });

    // Save completed state
    await this.saveState(chatId, prompt, 'completed', messages);
    await saveFinalAnswer(chatId, this.userId, finalAnswer);

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
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    };

    await saveWorkflow(chatId, this.userId, data);
  }
}
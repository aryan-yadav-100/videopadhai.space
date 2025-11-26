import { motion } from 'framer-motion'; // Import your Loader from the ui folder
export default function loadingcss() {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-900 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl p-8 sm:p-12"
      >
        <div className="text-center space-y-6">

          <h2 className="text-md sm:text-md font-bold text-neutral-800 dark:text-neutral-200 font-mono">
            This can take 2-5 mins
          </h2>
          <h2 className="text-2xl sm:text-3xl font-bold text-neutral-800 dark:text-neutral-200 font-mono">
            Creating Your Video
          </h2>

          <div className="space-y-4">

            <div className="flex items-center justify-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 font-mono">
              <span className="text-orange-500 font-semibold capitalize"></span>
            </div>
          </div>

          <div className="space-y-2">
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 3, ease: 'easeInOut' }}
              className="h-2 bg-orange-500 rounded-full"
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-500 font-mono">
              Processing your request...
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

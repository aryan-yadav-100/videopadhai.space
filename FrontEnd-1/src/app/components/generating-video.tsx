import { motion } from "framer-motion";

export default function LoadingCss() {
  return (
    <div className="min-h-screen w-full bg-white dark:bg-neutral-900 flex items-center justify-center px-4 sm:px-6 lg:px-12">
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="
          w-full
          max-w-sm
          sm:max-w-md
          md:max-w-2xl
          lg:max-w-4xl
          xl:max-w-5xl
          bg-white dark:bg-neutral-900
          rounded-2xl
          shadow-2xl
          p-6 sm:p-8 md:p-12 lg:p-16
        "
      >
        <div className="text-center space-y-6 md:space-y-8">

          <h2 className="text-sm sm:text-base md:text-lg font-bold text-neutral-600 dark:text-neutral-400 font-mono">
            This can take 2–5 minutes
          </h2>

          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-neutral-800 dark:text-neutral-200 font-mono">
            Creating Your Video
          </h1>

          {/* Progress Section */}
          <div className="space-y-3 md:space-y-4">
            <div className="w-full max-w-xs sm:max-w-sm md:max-w-md mx-auto">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 3, ease: "easeInOut", repeat: Infinity }}
                className="h-2 sm:h-3 bg-orange-500 rounded-full"
              />
            </div>

            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-500 font-mono">
              Processing your request…
            </p>
          </div>

        </div>
      </motion.div>

    </div>
  );
}

declare namespace NodeJS {
  interface Process {
    /** Set by suppress-abort.cjs preload to avoid double-registering listeners */
    __suppressAbortLoaded?: boolean;
  }
}


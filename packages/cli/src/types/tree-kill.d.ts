declare module 'tree-kill' {
  function kill(pid: number, callback?: (error?: Error) => void): void;
  function kill(pid: number, signal?: string | number, callback?: (error?: Error) => void): void;
  export = kill;
}
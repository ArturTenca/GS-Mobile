// Acesso minimo ao sistema de arquivos para as auditorias (jest roda em Node; o projeto nao
// instala @types/node). Usado apenas por testes.
declare const require: (id: string) => unknown;
declare const process: { cwd(): string };

type FsApi = {
  readdirSync(path: string): string[];
  readFileSync(path: string, enc: 'utf8'): string;
  statSync(path: string): { isDirectory(): boolean };
};
type PathApi = { join(...parts: string[]): string };

const fs = require('fs') as FsApi;
const path = require('path') as PathApi;

export const readdirSync = fs.readdirSync;
export const readFileSync = fs.readFileSync;
export const statSync = fs.statSync;
export const join = path.join;
export const repoRoot = (): string => process.cwd();

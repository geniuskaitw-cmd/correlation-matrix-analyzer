export interface DataRow {
  [key: string]: any;
}

export interface ParsedData {
  headers: string[];
  rows: any[][]; // Raw array of arrays
}

export interface VariableData {
  name: string;
  values: number[];
}

export interface CorrelationResult {
  var1: string;
  var2: string;
  coefficient: number;
}

export type Matrix = {
  variables: string[];
  grid: number[][]; // [row_index][col_index]
};
import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Erro:', err);

  // Se for um erro de validação ou outro erro conhecido
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Erro de validação',
      errors: err.message
    });
  }

  // Erro padrão
  return res.status(500).json({
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
}; 
import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    return res.status(403).json({ error: 'Invalid or expired access token' });
  }

  req.user = payload;
  return next();
};
// Add a type declaration extension helper if needed, but exporting AuthenticatedRequest is sufficient.

import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../../db';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// Dev login - auto-creates user for testing
router.post('/dev-login', async (req, res) => {
  try {
    const email = 'dev@botschat.app';
    
    // Find or create dev user
    let user = await UserModel.findByEmail(email);
    if (!user) {
      user = await UserModel.create(email, 'devpassword123');
    }
    
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      id: user.id,
      email: user.email,
      displayName: 'Dev User',
      token
    });
  } catch (err) {
    console.error('Dev login error:', err);
    res.status(500).json({ error: 'Dev login failed' });
  }
});

export { router as devAuthRouter };
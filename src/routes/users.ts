import { Router, Request, Response } from 'express';
import prisma from '../lib/database';

const router = Router();

// GET /api/users/:userId
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const userId = BigInt(req.params.userId);

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Serialize the user data
    const serializedUser = {
      id: Number(user.id),
      email: user.email,
      name: user.name,
      picture: user.picture,
      age: user.age,
      weight: user.weight,
      height: user.height,
      fitnessLevel: user.fitnessLevel,
      goals: user.goals ? JSON.parse(user.goals) : [],
      availableEquipment: user.availableEquipment ? JSON.parse(user.availableEquipment) : [],
      bodyweightExercises: user.bodyweightExercises ? JSON.parse(user.bodyweightExercises) : [],
      createdAt: user.createdAt.toISOString(),
      lastLogin: user.lastLogin?.toISOString()
    };

    return res.json(serializedUser);
  } catch (error) {
    console.error('Error getting user:', error);
    return res.status(500).json({ error: 'Failed to get user' });
  }
});

// PUT /api/users/:userId
router.put('/:userId', async (req: Request, res: Response) => {
  try {
    const userId = BigInt(req.params.userId);
    const {
      name,
      email,
      age,
      weight,
      height,
      fitnessLevel,
      goals,
      availableEquipment,
      bodyweightExercises
    } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        age: age ? parseInt(age) : null,
        weight: weight ? parseFloat(weight) : null,
        height: height ? parseFloat(height) : null,
        fitnessLevel,
        goals: goals ? JSON.stringify(goals) : null,
        availableEquipment: availableEquipment ? JSON.stringify(availableEquipment) : null,
        bodyweightExercises: bodyweightExercises ? JSON.stringify(bodyweightExercises) : null
      }
    });

    // Serialize the response
    const serializedUser = {
      id: Number(user.id),
      email: user.email,
      name: user.name,
      picture: user.picture,
      age: user.age,
      weight: user.weight,
      height: user.height,
      fitnessLevel: user.fitnessLevel,
      goals: user.goals ? JSON.parse(user.goals) : [],
      availableEquipment: user.availableEquipment ? JSON.parse(user.availableEquipment) : [],
      bodyweightExercises: user.bodyweightExercises ? JSON.parse(user.bodyweightExercises) : [],
      createdAt: user.createdAt.toISOString(),
      lastLogin: user.lastLogin?.toISOString()
    };

    return res.json(serializedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ error: 'Failed to update user' });
  }
});

export default router;

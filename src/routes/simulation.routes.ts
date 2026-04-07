import { Router } from 'express';
import { adversarialService } from '../services/adversarial.service';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   POST /api/simulation/trigger
 * @desc    Manually trigger a random security simulation
 * @access  Private (Admin)
 */
router.post('/trigger', authenticate, authorize(['security_admin']), async (req, res) => {
    try {
        const { clearanceLevel } = req.body;
        const result = await adversarialService.runRandomSimulation(clearanceLevel ? Number(clearanceLevel) : undefined);

        res.json({
            success: true,
            message: 'Simulation executed successfully',
            data: result
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: 'Simulation failed',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/simulation/mode
 * @desc    Toggle between User Mode and Ethical Hacker Mode
 * @access  Private (Admin)
 */
router.post('/mode', authenticate, authorize(['security_admin']), async (req, res) => {
    const { enabled } = req.body;

    if (enabled) {
        adversarialService.startAutonomousMode();
    } else {
        adversarialService.stopAutonomousMode();
    }

    res.json({
        success: true,
        message: `Ethical Hacker Mode ${enabled ? 'activated' : 'deactivated'}`
    });
});

/**
 * @route   POST /api/simulation/execute/:id
 * @desc    Execute a specific attack pattern from the library
 * @access  Private (Admin)
 */
router.post('/execute/:id', authenticate, authorize(['security_admin']), async (req, res) => {
    try {
        const id = req.params.id as string;
        const { clearanceLevel } = req.body;
        const result = await adversarialService.executeSpecificAttack(id, clearanceLevel ? Number(clearanceLevel) : undefined);

        res.json({
            success: true,
            message: 'Attack simulation executed successfully',
            data: result
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: 'Attack execution failed',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/simulation/patterns
 * @desc    Get the list of attack patterns in the library
 * @access  Private
 */
router.get('/patterns', authenticate, (req, res) => {
    // We can expose the library for visibility
    res.json({
        success: true,
        data: (adversarialService as any).attackLibrary
    });
});

export default router;

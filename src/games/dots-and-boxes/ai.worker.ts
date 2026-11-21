// Runs the Dots & Boxes computer off the main thread (big boards take a moment).
import { serveMoves } from '../worker-client';
import { chooseMove } from './ai';

serveMoves(chooseMove);

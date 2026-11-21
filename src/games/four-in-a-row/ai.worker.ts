// Runs the Four in a Row search off the main thread so animations never stutter.
import { serveMoves } from '../worker-client';
import { chooseMove } from './ai';

serveMoves(chooseMove);

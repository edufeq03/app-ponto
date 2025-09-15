import Constants from 'expo-constants';
import { GOOGLE_VISION_API_KEY as ENV_GOOGLE_VISION_API_KEY } from '@env';

export const GOOGLE_CLOUD_VISION_API_KEY = ENV_GOOGLE_VISION_API_KEY || Constants.expoConfig.extra.GOOGLE_VISION_API_KEY;
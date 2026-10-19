import type { Profile } from './entities';

/** Port: where the profile comes from (JSON files today, an API tomorrow). */
export interface ProfileRepository {
  load(): Promise<Profile>;
}

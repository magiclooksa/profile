import type { Profile } from '../domain/entities';
import type { ProfileRepository } from '../domain/ProfileRepository';

/** Use case: load the profile, keeping only what is worth showing. */
export class GetProfile {
  constructor(private readonly repository: ProfileRepository) {}

  async execute(): Promise<Profile> {
    const profile = await this.repository.load();
    return {
      ...profile,
      // A project with no images has nothing to display.
      projects: profile.projects.filter((p) => p.images.length > 0 || p.layout === 'compare'),
    };
  }
}

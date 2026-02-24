export interface ValorantPlayer {
  id: number;
  name: string;          // Their in-game handle (e.g., "TenZ")
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
  role: string | null;    // e.g., "Duelist"
  nationality: string | null;
  current_team: {
    name: string;
    image_url: string | null;
  } | null;
}
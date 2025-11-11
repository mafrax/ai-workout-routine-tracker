import axios from 'axios';

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  embedUrl: string;
}

export class YouTubeService {
  private apiKey: string;
  private baseUrl = 'https://www.googleapis.com/youtube/v3';

  constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ YOUTUBE_API_KEY not found in environment variables');
    }
  }

  /**
   * Search for exercise demonstration videos on YouTube
   * Focuses on short-form content with queries optimized for form demonstrations
   */
  async searchExerciseVideos(exerciseName: string, maxResults: number = 3): Promise<YouTubeVideo[]> {
    if (!this.apiKey) {
      throw new Error('YouTube API key is not configured');
    }

    try {
      console.log(`🔍 Searching YouTube for: ${exerciseName}`);

      // Create multiple search queries to find the best exercise demonstrations
      const searchQueries = [
        `how to ${exerciseName} perfect form`,
        `${exerciseName} proper technique`,
        `${exerciseName} tutorial`,
      ];

      let allVideos: YouTubeVideo[] = [];

      // Search with the first query to get the best results
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          key: this.apiKey,
          part: 'snippet',
          q: searchQueries[0],
          type: 'video',
          maxResults: maxResults * 2, // Get more results to filter
          videoDuration: 'short', // Prefer shorter videos
          videoDefinition: 'high',
          order: 'relevance',
          safeSearch: 'strict',
        },
      });

      console.log(`✅ Found ${response.data.items?.length || 0} videos`);

      if (!response.data.items || response.data.items.length === 0) {
        return [];
      }

      // Transform the results
      allVideos = response.data.items.map((item: any) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
        embedUrl: `https://www.youtube.com/embed/${item.id.videoId}`,
      }));

      // Filter out videos that are too long by checking video details
      const videoIds = allVideos.map(v => v.id).join(',');
      const detailsResponse = await axios.get(`${this.baseUrl}/videos`, {
        params: {
          key: this.apiKey,
          part: 'contentDetails',
          id: videoIds,
        },
      });

      // Filter for videos under 10 minutes (shorts and quick tutorials)
      const shortVideos = allVideos.filter((video, index) => {
        const duration = detailsResponse.data.items[index]?.contentDetails?.duration || '';
        // Parse ISO 8601 duration (e.g., "PT5M30S" = 5 minutes 30 seconds)
        // If it contains 'H' (hours), skip it
        if (duration.includes('H')) return false;
        // If duration is over 10 minutes, skip it
        const minutes = duration.match(/(\d+)M/);
        if (minutes && parseInt(minutes[1]) > 10) return false;
        return true;
      });

      console.log(`📹 Filtered to ${shortVideos.length} short videos`);

      // Return top results
      return shortVideos.slice(0, maxResults);
    } catch (error: any) {
      console.error('❌ Error searching YouTube:', error.response?.data || error.message);
      throw new Error(`Failed to search YouTube: ${error.message}`);
    }
  }

  /**
   * Check if YouTube API is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }
}

export const youtubeService = new YouTubeService();

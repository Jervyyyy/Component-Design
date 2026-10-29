// Sample content: real Singapore travel footage (Wikimedia Commons, see CREDITS.md), matching the
// destination used in the TDS iPhone Duo case (Marina Bay · Gardens by the Bay · Chinatown · Jewel).
// `chapters` feeds Video.ProgressBar hasChapters (fractions of the duration).
const M = './assets/media/';

export const CLIPS = [
  { id: 'marina', title: 'Marina Bay · Skyline at Night', place: 'Singapore', views: '12k views', duration: 25.96, chapters: [0.3, 0.58, 0.81], group: 'official' },
  { id: 'rhapsody', title: 'Gardens by the Bay · Garden Rhapsody', place: 'Singapore', views: '8.6k views', duration: 30.0, chapters: [0.24, 0.52, 0.77], group: 'official' },
  { id: 'chinatown', title: 'Chinatown at Night', place: 'Singapore', views: '5.1k views', duration: 26.0, chapters: [0.35, 0.7], group: 'guest' },
  { id: 'cloudforest', title: 'Cloud Forest Waterfall', place: 'Singapore', views: '3.9k views', duration: 8.9, chapters: [0.5], group: 'official' },
  { id: 'jewel', title: 'Jewel Changi Airport · Rain Vortex', place: 'Singapore', views: '21k views', duration: 5.86, chapters: [0.5], group: 'official' },
  { id: 'supertree', title: 'Supertree Grove Light Show', place: 'Singapore', views: '4.4k views', duration: 29.97, chapters: [0.33, 0.66], group: 'guest' },
  { id: 'chinatown-market', title: 'Chinatown Street Market', place: 'Singapore', views: '2.7k views', duration: 26.0, chapters: [0.4, 0.75], group: 'guest' },
].map((c) => ({ ...c, src: M + c.id + '.mp4', poster: M + c.id + '.jpg' }));

// Video.TopBar centerSlot → SegmentedControl (分组切换)
export const GROUPS = [
  { id: 'highlights', label: 'Highlights' },
  { id: 'official', label: 'Official' },
  { id: 'guest', label: 'Guest' },
];

export const clipsOf = (group) => (group === 'highlights' ? CLIPS : CLIPS.filter((c) => c.group === group));

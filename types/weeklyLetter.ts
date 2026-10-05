export interface WeeklyLetter {
  id: string;
  weekNumber: number;
  year: number;
  date: string;
  author: string;
  authorRole: string;
  authorAvatar?: string;
  title: string;
  summary: string;
  highlights: string[];
  content: string[];
  readTime: string;
}

export type PostitColor = 'yellow' | 'green' | 'blue' | 'pink' | 'orange' | 'purple';

export type ImprovementSuggestion = {
    id: string;
    title: string;
    description: string;
    category?: string;
    author: string;
    createdAt: string;
    likes: number;
    color: PostitColor;
};

export type NoticeBoardSuggestion = ImprovementSuggestion & {
    isLiked: boolean;
};

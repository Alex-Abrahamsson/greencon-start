import { ImprovementSuggestion } from "@/types/noticeBoard";

export const initialSuggestions: ImprovementSuggestion[] = [
    {
        id: "sug-1",
        title: "Dagens lunch från favoritrestauranger",
        description: "Vore guld att ha en sektion med dagens lunch från restaurangerna runt kontoret så man slipper googla varje dag!",
        author: "Marcus N.",
        createdAt: "2026-10-02",
        likes: 12,
        color: "yellow",
    },
    {
        id: "sug-2",
        title: "Väderprognos vid kontoret",
        description: "Lägg till en kompakt väderruta bredvid kalendern med aktuell temperatur och prognos inför hemgång.",
        author: "Emma S.",
        createdAt: "2026-10-03",
        likes: 8,
        color: "blue",
    },
    {
        id: "sug-3",
        title: "Snabbsök bland länkarna",
        description: "När vi får fler genvägar vore det toppen med ett litet sökfält för att filtrera länkarna direkt med tangentbordet.",
        author: "Johan L.",
        createdAt: "2026-10-04",
        likes: 5,
        color: "green",
    },
    {
        id: "sug-4",
        title: "Manuellt reglage för mörkt/ljust läge",
        description: "En snabbknapp i sidhuvudet för att kunna växla manuellt mellan ljust och mörkt tema oberoende av systeminställning.",
        author: "Sara K.",
        createdAt: "2026-10-05",
        likes: 7,
        color: "pink",
    },
    {
        id: "sug-5",
        title: "Egna bokmärken & genvägar",
        description: "Möjlighet att lägga till personliga genvägar direkt i snabblänkarna så att alla kan anpassa sin egen vy.",
        author: "Andreas B.",
        createdAt: "2026-10-05",
        likes: 11,
        color: "orange",
    }
];

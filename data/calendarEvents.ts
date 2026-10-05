import type { CalendarEvent } from "@/types/calendar";

export const calendarEvents: CalendarEvent[] = [
    {
        id: 1,
        dateLabel: "Idag",
        time: "15:00",
        title: "Driftunderhåll CRM",
        description: "CRM kan vara långsammare under eftermiddagen.",
        category: "Drift",
    },
    {
        id: 2,
        dateLabel: "Imorgon",
        time: "09:30",
        title: "Gemensamt informationsmöte",
        description: "Kort avstämning kring veckan och pågående projekt.",
        category: "Info",
    },
    {
        id: 3,
        dateLabel: "Fredag",
        time: "16:00",
        title: "AW efter jobbet",
        description: "Samling vid kontoret innan vi går vidare.",
        category: "Event",
    },
];
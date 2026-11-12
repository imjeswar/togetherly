import WidgetKit
import SwiftUI

struct LoveNotesEntry: TimelineEntry {
    let date: Date
    let noteTitle: String
    let noteSnippet: String
    let senderName: String
}

struct LoveNotesProvider: TimelineProvider {
    func placeholder(in context: Context) -> LoveNotesEntry {
        LoveNotesEntry(date: Date(), noteTitle: "When you miss me", noteSnippet: "You are the warmth in every cold day...", senderName: "Alex")
    }

    func getSnapshot(in context: Context, completion: @escaping (LoveNotesEntry) -> Void) {
        let entry = LoveNotesEntry(date: Date(), noteTitle: "When you miss me", noteSnippet: "You are the warmth in every cold day...", senderName: "Alex")
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<LoveNotesEntry>) -> Void) {
        let entry = LoveNotesEntry(date: Date(), noteTitle: "When you miss me", noteSnippet: "You are the warmth in every cold day...", senderName: "Alex")
        let next = Calendar.current.date(byAdding: .hour, value: 2, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(next))
        completion(timeline)
    }
}

struct LoveNotesWidgetView: View {
    var entry: LoveNotesProvider.Entry

    var body: some View {
        ZStack {
            Color(red: 0.13, green: 0.11, blue: 0.15) // #211B27

            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Image(systemName: "envelope.fill")
                        .foregroundColor(Color(red: 0.91, green: 0.63, blue: 0.66))
                        .font(.system(size: 14))
                    Text("Love Note")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(Color(red: 0.91, green: 0.63, blue: 0.66))
                    Spacer()
                    Text("From \(entry.senderName)")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(Color(red: 0.85, green: 0.72, blue: 0.49))
                }

                Text(entry.noteTitle)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(Color(red: 1.0, green: 0.97, blue: 0.96))
                    .lineLimit(1)

                Text(entry.noteSnippet)
                    .font(.system(size: 12))
                    .foregroundColor(Color(red: 0.73, green: 0.68, blue: 0.73))
                    .lineLimit(2)
                    .privacySensitive() // Redacts sensitive romantic text when device is locked

                Spacer()

                HStack {
                    Image(systemName: "lock.shield.fill")
                        .font(.system(size: 10))
                        .foregroundColor(Color(red: 0.2, green: 0.83, blue: 0.6))
                    Text("End-to-End Encrypted")
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundColor(Color(red: 0.2, green: 0.83, blue: 0.6))
                }
            }
            .padding(14)
        }
        .widgetURL(URL(string: "togetherly://love-notes"))
    }
}

struct LoveNotesWidget: Widget {
    let kind: String = "LoveNotesWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: LoveNotesProvider()) { entry in
            LoveNotesWidgetView(entry: entry)
        }
        .configurationDisplayName("Love Notes")
        .description("Surfaces your sealed and decrypted love letters from your partner.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}


import WidgetKit
import SwiftUI

struct DailyQuestionEntry: TimelineEntry {
    let date: Date
    let questionText: String
    let bothAnswered: Bool
    let partnerHasAnswered: Bool
}

struct DailyQuestionProvider: TimelineProvider {
    func placeholder(in context: Context) -> DailyQuestionEntry {
        DailyQuestionEntry(date: Date(), questionText: "What made you smile thinking of us today?", bothAnswered: false, partnerHasAnswered: true)
    }

    func getSnapshot(in context: Context, completion: @escaping (DailyQuestionEntry) -> Void) {
        let entry = DailyQuestionEntry(date: Date(), questionText: "What made you smile thinking of us today?", bothAnswered: false, partnerHasAnswered: true)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<DailyQuestionEntry>) -> Void) {
        let entry = DailyQuestionEntry(date: Date(), questionText: "What made you smile thinking of us today?", bothAnswered: false, partnerHasAnswered: true)
        let next = Calendar.current.date(byAdding: .hour, value: 1, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(next))
        completion(timeline)
    }
}

struct DailyQuestionWidgetView: View {
    var entry: DailyQuestionProvider.Entry

    var body: some View {
        ZStack {
            Color(red: 0.13, green: 0.11, blue: 0.15) // #211B27

            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text("Daily Question")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(Color(red: 0.91, green: 0.63, blue: 0.66)) // #E8A0A8

                    Spacer()

                    Text(entry.bothAnswered ? "✨ Unlocked" : (entry.partnerHasAnswered ? "Partner Answered" : "Waiting"))
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundColor(Color(red: 0.85, green: 0.72, blue: 0.49))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.white.opacity(0.08))
                        .cornerRadius(6)
                }

                Text(entry.questionText)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(Color(red: 1.0, green: 0.97, blue: 0.96))
                    .lineLimit(3)
                    .privacySensitive() // Hides sensitive content on locked device

                Spacer()

                HStack {
                    Image(systemName: "lock.open.fill")
                        .font(.system(size: 10))
                        .foregroundColor(Color(red: 0.73, green: 0.68, blue: 0.73))
                    Text("Tap to answer together")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(Color(red: 0.73, green: 0.68, blue: 0.73))
                }
            }
            .padding(14)
        }
        .widgetURL(URL(string: "togetherly://question"))
    }
}

struct DailyQuestionWidget: Widget {
    let kind: String = "DailyQuestionWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: DailyQuestionProvider()) { entry in
            DailyQuestionWidgetView(entry: entry)
        }
        .configurationDisplayName("Daily Question")
        .description("View today's intimacy question and mutual response status.")
        .supportedFamilies([.systemMedium])
    }
}


import WidgetKit
import SwiftUI

struct RelationshipEntry: TimelineEntry {
    let date: Date
    let daysTogether: Int
    let streakCount: Int
    let partnerName: String
}

struct RelationshipProvider: TimelineProvider {
    func placeholder(in context: Context) -> RelationshipEntry {
        RelationshipEntry(date: Date(), daysTogether: 365, streakCount: 14, partnerName: "Alex")
    }

    func getSnapshot(in context: Context, completion: @escaping (RelationshipEntry) -> Void) {
        let entry = RelationshipEntry(date: Date(), daysTogether: 365, streakCount: 14, partnerName: "Alex")
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<RelationshipEntry>) -> Void) {
        let entry = RelationshipEntry(date: Date(), daysTogether: 365, streakCount: 14, partnerName: "Alex")
        let nextUpdate = Calendar.current.date(byAdding: .hour, value: 1, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}

struct RelationshipWidgetView: View {
    var entry: RelationshipProvider.Entry

    var body: some View {
        ZStack {
            Color(red: 0.13, green: 0.11, blue: 0.15) // #211B27 card bg

            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Image(systemName: "flame.fill")
                        .foregroundColor(Color(red: 0.91, green: 0.63, blue: 0.66)) // #E8A0A8
                        .font(.system(size: 16))
                    Text("Togetherly")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(Color(red: 1.0, green: 0.97, blue: 0.96)) // #FFF8F5
                    Spacer()
                    Text("🔥 \(entry.streakCount)d")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(Color(red: 0.85, green: 0.72, blue: 0.49)) // #D9B77E
                }

                Spacer()

                VStack(alignment: .leading, spacing: 2) {
                    Text("\(entry.daysTogether) Days")
                        .font(.system(size: 24, weight: .black))
                        .foregroundColor(Color(red: 1.0, green: 0.97, blue: 0.96))
                    Text("with \(entry.partnerName)")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(Color(red: 0.73, green: 0.68, blue: 0.73)) // #B9AEB9
                }
            }
            .padding(14)
        }
        .widgetURL(URL(string: "togetherly://"))
    }
}

struct RelationshipWidget: Widget {
    let kind: String = "RelationshipWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: RelationshipProvider()) { entry in
            RelationshipWidgetView(entry: entry)
        }
        .configurationDisplayName("Our Little Space")
        .description("Track your days together and romantic streak.")
        .supportedFamilies([.systemSmall])
    }
}


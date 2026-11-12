import WidgetKit
import SwiftUI

struct QuickDrawingEntry: TimelineEntry {
    let date: Date
}

struct QuickDrawingProvider: TimelineProvider {
    func placeholder(in context: Context) -> QuickDrawingEntry {
        QuickDrawingEntry(date: Date())
    }

    func getSnapshot(in context: Context, completion: @escaping (QuickDrawingEntry) -> Void) {
        completion(QuickDrawingEntry(date: Date()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<QuickDrawingEntry>) -> Void) {
        let timeline = Timeline(entries: [QuickDrawingEntry(date: Date())], policy: .never)
        completion(timeline)
    }
}

struct QuickDrawingWidgetView: View {
    var entry: QuickDrawingProvider.Entry

    var body: some View {
        ZStack {
            Color(red: 0.13, green: 0.11, blue: 0.15) // #211B27

            VStack(spacing: 8) {
                Image(systemName: "pencil.tip.crop.circle")
                    .font(.system(size: 32))
                    .foregroundColor(Color(red: 0.91, green: 0.63, blue: 0.66)) // #E8A0A8

                Text("Quick Sketch")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(Color(red: 1.0, green: 0.97, blue: 0.96))

                Text("Tap to doodle")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(Color(red: 0.85, green: 0.72, blue: 0.49))
            }
            .padding()
        }
        .widgetURL(URL(string: "togetherly://canvas/quick"))
    }
}

struct QuickDrawingWidget: Widget {
    let kind: String = "QuickDrawingWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: QuickDrawingProvider()) { entry in
            QuickDrawingWidgetView(entry: entry)
        }
        .configurationDisplayName("Quick Drawing")
        .description("Instantly opens the lightweight drawing canvas to sketch for your partner.")
        .supportedFamilies([.systemSmall])
    }
}


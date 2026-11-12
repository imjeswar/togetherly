import WidgetKit
import SwiftUI

struct PhotoMemoryEntry: TimelineEntry {
    let date: Date
    let caption: String
    let photoData: Data?
}

struct PhotoMemoryProvider: TimelineProvider {
    func placeholder(in context: Context) -> PhotoMemoryEntry {
        PhotoMemoryEntry(date: Date(), caption: "Our intimate moment", photoData: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (PhotoMemoryEntry) -> Void) {
        let entry = PhotoMemoryEntry(date: Date(), caption: "Our intimate moment", photoData: nil)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<PhotoMemoryEntry>) -> Void) {
        let entry = PhotoMemoryEntry(date: Date(), caption: "Our intimate moment", photoData: nil)
        let next = Calendar.current.date(byAdding: .hour, value: 2, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(next))
        completion(timeline)
    }
}

struct PhotoMemoryWidgetView: View {
    var entry: PhotoMemoryProvider.Entry

    var body: some View {
        ZStack {
            Color(red: 0.13, green: 0.11, blue: 0.15)

            VStack(alignment: .leading) {
                Spacer()
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(entry.caption)
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(Color.white)
                            .lineLimit(1)
                        Text("Photo Snap")
                            .font(.system(size: 10))
                            .foregroundColor(Color(red: 0.91, green: 0.63, blue: 0.66))
                    }
                    Spacer()
                    Image(systemName: "camera.fill")
                        .font(.system(size: 14))
                        .foregroundColor(Color(red: 0.85, green: 0.72, blue: 0.49))
                }
                .padding(10)
                .background(Color.black.opacity(0.6))
            }
        }
        .widgetURL(URL(string: "togetherly://photos"))
    }
}

struct PhotoMemoryWidget: Widget {
    let kind: String = "PhotoMemoryWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: PhotoMemoryProvider()) { entry in
            PhotoMemoryWidgetView(entry: entry)
        }
        .configurationDisplayName("Photo Memories")
        .description("Surfaces your latest shared couple photo memory.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}


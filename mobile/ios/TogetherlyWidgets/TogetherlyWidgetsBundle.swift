import WidgetKit
import SwiftUI

@main
struct TogetherlyWidgetsBundle: WidgetBundle {
    var body: some Widget {
        RelationshipWidget()
        DailyQuestionWidget()
        PhotoMemoryWidget()
        QuickDrawingWidget()
        LoveNotesWidget()
    }
}


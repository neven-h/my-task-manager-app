import Foundation
import EventKit
import Capacitor

@objc(CalendarPlugin)
public class CalendarPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "CalendarPlugin"
    public let jsName = "Calendar"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "checkAccess", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAccess", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "addEvent", returnType: CAPPluginReturnPromise),
    ]

    private let store = EKEventStore()

    @objc func checkAccess(_ call: CAPPluginCall) {
        let status = EKEventStore.authorizationStatus(for: .event)
        call.resolve(["status": statusString(status)])
    }

    @objc func requestAccess(_ call: CAPPluginCall) {
        if #available(iOS 17.0, *) {
            // EventKit permission prompts must be requested from the main thread.
            DispatchQueue.main.async {
                self.store.requestWriteOnlyAccessToEvents { granted, error in
                    DispatchQueue.main.async {
                        if let error = error {
                            call.reject("Calendar access request failed: \(error.localizedDescription)")
                            return
                        }
                        let status = EKEventStore.authorizationStatus(for: .event)
                        call.resolve(["granted": granted, "status": self.statusString(status)])
                    }
                }
            }
        } else {
            DispatchQueue.main.async {
                self.store.requestAccess(to: .event) { granted, error in
                    DispatchQueue.main.async {
                        if let error = error {
                            call.reject("Calendar access request failed: \(error.localizedDescription)")
                            return
                        }
                        let status = EKEventStore.authorizationStatus(for: .event)
                        call.resolve(["granted": granted, "status": self.statusString(status)])
                    }
                }
            }
        }
    }

    @objc func addEvent(_ call: CAPPluginCall) {
        let status = EKEventStore.authorizationStatus(for: .event)
        if #available(iOS 17.0, *) {
            guard status == .fullAccess || status == .writeOnly else {
                call.reject("Calendar access not granted")
                return
            }
        } else {
            guard status == .authorized else {
                call.reject("Calendar access not granted")
                return
            }
        }

        guard let title = call.getString("title"), !title.isEmpty else {
            call.reject("Missing event title")
            return
        }
        guard let startStr = call.getString("startDate"),
              let endStr = call.getString("endDate") else {
            call.reject("Missing startDate or endDate")
            return
        }

        let allDay = call.getBool("allDay") ?? false

        guard let startDate = parseDate(startStr, allDay: allDay),
              let endDate = parseDate(endStr, allDay: allDay) else {
            call.reject("Could not parse startDate or endDate")
            return
        }

        let event = EKEvent(eventStore: store)
        event.title = title
        event.startDate = startDate
        event.endDate = endDate
        event.isAllDay = allDay
        event.calendar = store.defaultCalendarForNewEvents

        if let notes = call.getString("notes"), !notes.isEmpty {
            event.notes = notes
        }
        if let location = call.getString("location"), !location.isEmpty {
            event.location = location
        }

        do {
            try store.save(event, span: .thisEvent)
            DispatchQueue.main.async {
                call.resolve(["success": true, "eventId": event.eventIdentifier ?? ""])
            }
        } catch {
            DispatchQueue.main.async {
                call.reject("Failed to save event: \(error.localizedDescription)")
            }
        }
    }

    private func statusString(_ status: EKAuthorizationStatus) -> String {
        if #available(iOS 17.0, *) {
            switch status {
            case .fullAccess:
                return "fullAccess"
            case .writeOnly:
                return "writeOnly"
            case .denied:
                return "denied"
            case .restricted:
                return "restricted"
            case .notDetermined:
                return "notDetermined"
            @unknown default:
                return "notDetermined"
            }
        } else {
            switch status {
            case .authorized:
                return "authorized"
            case .fullAccess:
                return "authorized"
            case .writeOnly:
                return "writeOnly"
            case .denied:
                return "denied"
            case .restricted:
                return "restricted"
            case .notDetermined:
                return "notDetermined"
            @unknown default:
                return "notDetermined"
            }
        }
    }

    private func parseDate(_ str: String, allDay: Bool) -> Date? {
        let fmt = DateFormatter()
        fmt.timeZone = TimeZone.current

        if allDay {
            fmt.dateFormat = "yyyy-MM-dd"
        } else {
            fmt.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
        }

        return fmt.date(from: str)
    }
}

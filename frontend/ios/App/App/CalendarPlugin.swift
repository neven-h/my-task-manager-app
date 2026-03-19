// CalendarPlugin — Capacitor plugin to add events directly to Apple Calendar via EventKit
// Follows the same structure as BiometricAuthPlugin.swift

import Foundation
import EventKit
import Capacitor

@objc(CalendarPlugin)
public class CalendarPlugin: CAPPlugin {
    private let store = EKEventStore()

    // Returns the current calendar authorisation status as a string.
    // Possible values: "authorized", "writeOnly", "denied", "restricted", "notDetermined"
    @objc func checkAccess(_ call: CAPPluginCall) {
        let status = EKEventStore.authorizationStatus(for: .event)
        call.resolve(["status": statusString(status)])
    }

    // Requests calendar access from the user.
    // Returns { granted: bool, status: string }
    @objc func requestAccess(_ call: CAPPluginCall) {
        if #available(iOS 17.0, *) {
            store.requestFullAccessToEvents { granted, error in
                if let error = error {
                    call.reject("Calendar access request failed: \(error.localizedDescription)")
                    return
                }
                let status = EKEventStore.authorizationStatus(for: .event)
                call.resolve(["granted": granted, "status": self.statusString(status)])
            }
        } else {
            store.requestAccess(to: .event) { granted, error in
                if let error = error {
                    call.reject("Calendar access request failed: \(error.localizedDescription)")
                    return
                }
                let status = EKEventStore.authorizationStatus(for: .event)
                call.resolve(["granted": granted, "status": self.statusString(status)])
            }
        }
    }

    // Adds an event to the default calendar.
    // Expects: { title, startDate, endDate, notes?, location?, allDay? }
    // Returns: { success: bool, eventId: string }
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
              let endStr   = call.getString("endDate") else {
            call.reject("Missing startDate or endDate")
            return
        }

        let allDay = call.getBool("allDay") ?? false

        guard let startDate = parseDate(startStr, allDay: allDay),
              let endDate   = parseDate(endStr,   allDay: allDay) else {
            call.reject("Could not parse startDate or endDate")
            return
        }

        let event        = EKEvent(eventStore: store)
        event.title      = title
        event.startDate  = startDate
        event.endDate    = endDate
        event.isAllDay   = allDay
        event.calendar   = store.defaultCalendarForNewEvents

        if let notes = call.getString("notes"), !notes.isEmpty {
            event.notes = notes
        }
        if let location = call.getString("location"), !location.isEmpty {
            event.location = location
        }

        do {
            try store.save(event, span: .thisEvent)
            call.resolve(["success": true, "eventId": event.eventIdentifier ?? ""])
        } catch {
            call.reject("Failed to save event: \(error.localizedDescription)")
        }
    }

    // MARK: - Helpers

    private func statusString(_ status: EKAuthorizationStatus) -> String {
        if #available(iOS 17.0, *) {
            switch status {
            case .fullAccess:      return "fullAccess"
            case .writeOnly:       return "writeOnly"
            case .denied:          return "denied"
            case .restricted:      return "restricted"
            case .notDetermined:   return "notDetermined"
            @unknown default:      return "notDetermined"
            }
        } else {
            switch status {
            case .authorized:      return "authorized"
            case .denied:          return "denied"
            case .restricted:      return "restricted"
            case .notDetermined:   return "notDetermined"
            @unknown default:      return "notDetermined"
            }
        }
    }

    private func parseDate(_ str: String, allDay: Bool) -> Date? {
        if allDay {
            // Expects "YYYY-MM-DD"
            let fmt = DateFormatter()
            fmt.dateFormat = "yyyy-MM-dd"
            fmt.timeZone = TimeZone.current
            return fmt.date(from: str)
        } else {
            // Expects "YYYY-MM-DDTHH:MM:SS"
            let fmt = DateFormatter()
            fmt.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
            fmt.timeZone = TimeZone.current
            return fmt.date(from: str)
        }
    }
}

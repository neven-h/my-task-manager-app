#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wquoted-include-in-framework-header"
// Objective-C registration for the Calendar Capacitor plugin
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(CalendarPlugin, "Calendar",
           CAP_PLUGIN_METHOD(checkAccess, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(requestAccess, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(addEvent, CAPPluginReturnPromise);
);
#pragma clang diagnostic pop

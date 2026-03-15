#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wquoted-include-in-framework-header"
// Objective-C registration for the BiometricAuth Capacitor plugin
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(BiometricAuthPlugin, "BiometricAuth",
           CAP_PLUGIN_METHOD(enable, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(authenticate, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(disable, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(isAvailable, CAPPluginReturnPromise);
);
#pragma clang diagnostic pop


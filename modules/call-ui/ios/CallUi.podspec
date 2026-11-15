Pod::Spec.new do |s|
  s.name           = 'CallUi'
  s.version        = '1.0.0'
  s.summary        = 'Samadhan native incoming calls: PushKit VoIP + CallKit'
  s.description    = 'Rings incoming calls through CallKit from PushKit VoIP pushes, even when the app is killed.'
  s.license        = 'UNLICENSED'
  s.author         = 'Samadhan'
  s.homepage       = 'https://samadhan.fab5connect.com'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true
  s.swift_version  = '5.9'

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'CallKit', 'PushKit', 'AVFoundation'

  s.source_files = '**/*.{h,m,swift}'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end

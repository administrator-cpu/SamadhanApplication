import React from 'react';
import { View } from 'react-native';

export default function AnimatedMesh() {
  return (
    // A nice, static pastel gradient for web users
    <View 
      className="flex-1 w-full h-full bg-orange-100"
      style={{
        backgroundImage: 'radial-gradient(at 10% 20%, #FFFACD 0px, transparent 50%), radial-gradient(at 80% 80%, #FFA07A 0px, transparent 50%), radial-gradient(at 50% 50%, #FFFFF0 0px, transparent 50%)'
      }}
    />
  );
}
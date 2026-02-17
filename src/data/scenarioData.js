export const scenarios = {
  'family-kit': {
    id: 'family-kit',
    icon: 'clipboardText',
    title: 'scenarioData.familyKitTitle',
    description: 'scenarioData.familyKitDesc',
    emergencyScript: [
      {
        step: 1,
        action: 'scenarioData.familyKitStep1Action',
        script: 'scenarioData.familyKitStep1Script',
        explanation: 'scenarioData.familyKitStep1Explanation',
        copyable: false
      },
      {
        step: 2,
        action: 'scenarioData.familyKitStep2Action',
        script: 'scenarioData.familyKitStep2Script',
        explanation: 'scenarioData.familyKitStep2Explanation',
        copyable: false
      },
      {
        step: 3,
        action: 'scenarioData.familyKitStep3Action',
        script: 'scenarioData.familyKitStep3Script',
        explanation: 'scenarioData.familyKitStep3Explanation',
        copyable: false
      },
      {
        step: 4,
        action: 'scenarioData.familyKitStep4Action',
        script: 'scenarioData.familyKitStep4Script',
        explanation: 'scenarioData.familyKitStep4Explanation',
        copyable: false
      },
      {
        step: 5,
        action: 'scenarioData.familyKitStep5Action',
        script: 'scenarioData.familyKitStep5Script',
        explanation: 'scenarioData.familyKitStep5Explanation',
        copyable: false
      },
      {
        step: 6,
        action: 'scenarioData.familyKitStep6Action',
        script: 'scenarioData.familyKitStep6Script',
        explanation: 'scenarioData.familyKitStep6Explanation',
        copyable: true
      },
      {
        step: 7,
        action: 'scenarioData.familyKitStep7Action',
        script: 'scenarioData.familyKitStep7Script',
        explanation: 'scenarioData.familyKitStep7Explanation',
        copyable: false
      }
    ],
    studyContent: {
      overview: 'scenarioData.familyKitOverview',
      keyPoints: [
        'scenarioData.familyKitKeyPoint1',
        'scenarioData.familyKitKeyPoint2',
        'scenarioData.familyKitKeyPoint3',
        'scenarioData.familyKitKeyPoint4',
        'scenarioData.familyKitKeyPoint5',
        'scenarioData.familyKitKeyPoint6',
        'scenarioData.familyKitKeyPoint7'
      ],
      warrantTypes: {
        judicial: {
          title: 'scenarioData.familyKitWarrantJudicialTitle',
          description: 'scenarioData.familyKitWarrantJudicialDesc',
          icon: 'check',
          color: 'green'
        },
        administrative: {
          title: 'scenarioData.familyKitWarrantAdminTitle',
          description: 'scenarioData.familyKitWarrantAdminDesc',
          icon: 'x',
          color: 'red'
        }
      }
    }
  },

  door: {
    id: 'door',
    icon: 'home',
    title: 'scenarioData.doorTitle',
    description: 'scenarioData.doorDesc',
    emergencyScript: [
      {
        step: 1,
        action: 'scenarioData.doorStep1Action',
        script: 'scenarioData.doorStep1Script',
        explanation: 'scenarioData.doorStep1Explanation',
        copyable: true
      },
      {
        step: 2,
        action: 'scenarioData.doorStep2Action',
        script: 'scenarioData.doorStep2Script',
        explanation: 'scenarioData.doorStep2Explanation',
        copyable: true
      },
      {
        step: 3,
        action: 'scenarioData.doorStep3Action',
        script: 'scenarioData.doorStep3Script',
        explanation: 'scenarioData.doorStep3Explanation',
        copyable: true
      },
      {
        step: 4,
        action: 'scenarioData.doorStep4Action',
        script: 'scenarioData.doorStep4Script',
        explanation: 'scenarioData.doorStep4Explanation',
        copyable: true
      },
      {
        step: 5,
        action: 'scenarioData.doorStep5Action',
        script: 'scenarioData.doorStep5Script',
        explanation: 'scenarioData.doorStep5Explanation',
        copyable: false
      }
    ],
    studyContent: {
      overview: 'scenarioData.doorOverview',
      keyPoints: [
        'scenarioData.doorKeyPoint1',
        'scenarioData.doorKeyPoint2',
        'scenarioData.doorKeyPoint3',
        'scenarioData.doorKeyPoint4',
        'scenarioData.doorKeyPoint5',
        'scenarioData.doorKeyPoint6'
      ],
      warrantTypes: {
        judicial: {
          title: 'scenarioData.doorWarrantJudicialTitle',
          description: 'scenarioData.doorWarrantJudicialDesc',
          icon: 'scale',
          color: 'red'
        },
        administrative: {
          title: 'scenarioData.doorWarrantAdminTitle',
          description: 'scenarioData.doorWarrantAdminDesc',
          icon: 'fileText',
          color: 'amber'
        }
      }
    }
  },

  street: {
    id: 'street',
    icon: 'user',
    title: 'scenarioData.streetTitle',
    description: 'scenarioData.streetDesc',
    emergencyScript: [
      {
        step: 1,
        action: 'scenarioData.streetStep1Action',
        script: 'scenarioData.streetStep1Script',
        explanation: 'scenarioData.streetStep1Explanation',
        copyable: true
      },
      {
        step: 2,
        action: 'scenarioData.streetStep2Action',
        script: 'scenarioData.streetStep2Script',
        explanation: 'scenarioData.streetStep2Explanation',
        copyable: true
      },
      {
        step: 3,
        action: 'scenarioData.streetStep3Action',
        script: 'scenarioData.streetStep3Script',
        explanation: 'scenarioData.streetStep3Explanation',
        copyable: true
      },
      {
        step: 4,
        action: 'scenarioData.streetStep4Action',
        script: 'scenarioData.streetStep4Script',
        explanation: 'scenarioData.streetStep4Explanation',
        copyable: true
      },
      {
        step: 5,
        action: 'scenarioData.streetStep5Action',
        script: 'scenarioData.streetStep5Script',
        explanation: 'scenarioData.streetStep5Explanation',
        copyable: false
      }
    ],
    studyContent: {
      overview: 'scenarioData.streetOverview',
      keyPoints: [
        'scenarioData.streetKeyPoint1',
        'scenarioData.streetKeyPoint2',
        'scenarioData.streetKeyPoint3',
        'scenarioData.streetKeyPoint4',
        'scenarioData.streetKeyPoint5',
        'scenarioData.streetKeyPoint6'
      ],
      warrantTypes: {
        judicial: {
          title: 'scenarioData.streetWarrantJudicialTitle',
          description: 'scenarioData.streetWarrantJudicialDesc',
          icon: 'check',
          color: 'green'
        },
        administrative: {
          title: 'scenarioData.streetWarrantAdminTitle',
          description: 'scenarioData.streetWarrantAdminDesc',
          icon: 'x',
          color: 'red'
        }
      }
    }
  },

  vehicle: {
    id: 'vehicle',
    icon: 'car',
    title: 'scenarioData.vehicleTitle',
    description: 'scenarioData.vehicleDesc',
    emergencyScript: [
      {
        step: 1,
        action: 'scenarioData.vehicleStep1Action',
        script: 'scenarioData.vehicleStep1Script',
        explanation: 'scenarioData.vehicleStep1Explanation',
        copyable: false
      },
      {
        step: 2,
        action: 'scenarioData.vehicleStep2Action',
        script: 'scenarioData.vehicleStep2Script',
        explanation: 'scenarioData.vehicleStep2Explanation',
        copyable: true
      },
      {
        step: 3,
        action: 'scenarioData.vehicleStep3Action',
        script: 'scenarioData.vehicleStep3Script',
        explanation: 'scenarioData.vehicleStep3Explanation',
        copyable: true
      },
      {
        step: 4,
        action: 'scenarioData.vehicleStep4Action',
        script: 'scenarioData.vehicleStep4Script',
        explanation: 'scenarioData.vehicleStep4Explanation',
        copyable: true
      },
      {
        step: 5,
        action: 'scenarioData.vehicleStep5Action',
        script: 'scenarioData.vehicleStep5Script',
        explanation: 'scenarioData.vehicleStep5Explanation',
        copyable: false
      }
    ],
    studyContent: {
      overview: 'scenarioData.vehicleOverview',
      keyPoints: [
        'scenarioData.vehicleKeyPoint1',
        'scenarioData.vehicleKeyPoint2',
        'scenarioData.vehicleKeyPoint3',
        'scenarioData.vehicleKeyPoint4',
        'scenarioData.vehicleKeyPoint5',
        'scenarioData.vehicleKeyPoint6'
      ],
      warrantTypes: {
        judicial: {
          title: 'scenarioData.vehicleWarrantJudicialTitle',
          description: 'scenarioData.vehicleWarrantJudicialDesc',
          icon: 'scale',
          color: 'red'
        },
        administrative: {
          title: 'scenarioData.vehicleWarrantAdminTitle',
          description: 'scenarioData.vehicleWarrantAdminDesc',
          icon: 'ban',
          color: 'amber'
        }
      }
    }
  },

  border: {
    id: 'border',
    icon: 'shield',
    title: 'scenarioData.borderTitle',
    description: 'scenarioData.borderDesc',
    emergencyScript: [
      {
        step: 1,
        action: 'scenarioData.borderStep1Action',
        script: 'scenarioData.borderStep1Script',
        explanation: 'scenarioData.borderStep1Explanation',
        copyable: false
      },
      {
        step: 2,
        action: 'scenarioData.borderStep2Action',
        script: 'scenarioData.borderStep2Script',
        explanation: 'scenarioData.borderStep2Explanation',
        copyable: false
      },
      {
        step: 3,
        action: 'scenarioData.borderStep3Action',
        script: 'scenarioData.borderStep3Script',
        explanation: 'scenarioData.borderStep3Explanation',
        copyable: true
      },
      {
        step: 4,
        action: 'scenarioData.borderStep4Action',
        script: 'scenarioData.borderStep4Script',
        explanation: 'scenarioData.borderStep4Explanation',
        copyable: true
      },
      {
        step: 5,
        action: 'scenarioData.borderStep5Action',
        script: 'scenarioData.borderStep5Script',
        explanation: 'scenarioData.borderStep5Explanation',
        copyable: true
      }
    ],
    studyContent: {
      overview: 'scenarioData.borderOverview',
      keyPoints: [
        'scenarioData.borderKeyPoint1',
        'scenarioData.borderKeyPoint2',
        'scenarioData.borderKeyPoint3',
        'scenarioData.borderKeyPoint4',
        'scenarioData.borderKeyPoint5',
        'scenarioData.borderKeyPoint6'
      ],
      warrantTypes: {
        judicial: {
          title: 'scenarioData.borderWarrantJudicialTitle',
          description: 'scenarioData.borderWarrantJudicialDesc',
          icon: 'construction',
          color: 'red'
        },
        administrative: {
          title: 'scenarioData.borderWarrantAdminTitle',
          description: 'scenarioData.borderWarrantAdminDesc',
          icon: 'check',
          color: 'green'
        }
      }
    }
  },

  workplace: {
    id: 'workplace',
    icon: 'building2',
    title: 'scenarioData.workplaceTitle',
    description: 'scenarioData.workplaceDesc',
    emergencyScript: [
      {
        step: 1,
        action: 'scenarioData.workplaceStep1Action',
        script: 'scenarioData.workplaceStep1Script',
        explanation: 'scenarioData.workplaceStep1Explanation',
        copyable: false
      },
      {
        step: 2,
        action: 'scenarioData.workplaceStep2Action',
        script: 'scenarioData.workplaceStep2Script',
        explanation: 'scenarioData.workplaceStep2Explanation',
        copyable: true
      },
      {
        step: 3,
        action: 'scenarioData.workplaceStep3Action',
        script: 'scenarioData.workplaceStep3Script',
        explanation: 'scenarioData.workplaceStep3Explanation',
        copyable: true
      },
      {
        step: 4,
        action: 'scenarioData.workplaceStep4Action',
        script: 'scenarioData.workplaceStep4Script',
        explanation: 'scenarioData.workplaceStep4Explanation',
        copyable: true
      },
      {
        step: 5,
        action: 'scenarioData.workplaceStep5Action',
        script: 'scenarioData.workplaceStep5Script',
        explanation: 'scenarioData.workplaceStep5Explanation',
        copyable: false
      }
    ],
    studyContent: {
      overview: 'scenarioData.workplaceOverview',
      keyPoints: [
        'scenarioData.workplaceKeyPoint1',
        'scenarioData.workplaceKeyPoint2',
        'scenarioData.workplaceKeyPoint3',
        'scenarioData.workplaceKeyPoint4',
        'scenarioData.workplaceKeyPoint5',
        'scenarioData.workplaceKeyPoint6'
      ],
      warrantTypes: {
        judicial: {
          title: 'scenarioData.workplaceWarrantJudicialTitle',
          description: 'scenarioData.workplaceWarrantJudicialDesc',
          icon: 'scale',
          color: 'green'
        },
        administrative: {
          title: 'scenarioData.workplaceWarrantAdminTitle',
          description: 'scenarioData.workplaceWarrantAdminDesc',
          icon: 'doorOpen',
          color: 'amber'
        }
      }
    }
  },

  protest: {
    id: 'protest',
    icon: 'megaphone',
    title: 'scenarioData.protestTitle',
    description: 'scenarioData.protestDesc',
    emergencyScript: [
      {
        step: 1,
        action: 'scenarioData.protestStep1Action',
        script: 'scenarioData.protestStep1Script',
        explanation: 'scenarioData.protestStep1Explanation',
        copyable: true
      },
      {
        step: 2,
        action: 'scenarioData.protestStep2Action',
        script: 'scenarioData.protestStep2Script',
        explanation: 'scenarioData.protestStep2Explanation',
        copyable: false
      },
      {
        step: 3,
        action: 'scenarioData.protestStep3Action',
        script: 'scenarioData.protestStep3Script',
        explanation: 'scenarioData.protestStep3Explanation',
        copyable: true
      },
      {
        step: 4,
        action: 'scenarioData.protestStep4Action',
        script: 'scenarioData.protestStep4Script',
        explanation: 'scenarioData.protestStep4Explanation',
        copyable: false
      },
      {
        step: 5,
        action: 'scenarioData.protestStep5Action',
        script: 'scenarioData.protestStep5Script',
        explanation: 'scenarioData.protestStep5Explanation',
        copyable: true
      }
    ],
    studyContent: {
      overview: 'scenarioData.protestOverview',
      keyPoints: [
        'scenarioData.protestKeyPoint1',
        'scenarioData.protestKeyPoint2',
        'scenarioData.protestKeyPoint3',
        'scenarioData.protestKeyPoint4',
        'scenarioData.protestKeyPoint5',
        'scenarioData.protestKeyPoint6'
      ],
      warrantTypes: {
        judicial: {
          title: 'scenarioData.protestWarrantJudicialTitle',
          description: 'scenarioData.protestWarrantJudicialDesc',
          icon: 'check',
          color: 'green'
        },
        administrative: {
          title: 'scenarioData.protestWarrantAdminTitle',
          description: 'scenarioData.protestWarrantAdminDesc',
          icon: 'x',
          color: 'red'
        }
      }
    }
  },

  recording: {
    id: 'recording',
    icon: 'video',
    title: 'scenarioData.recordingTitle',
    description: 'scenarioData.recordingDesc',
    emergencyScript: [
      {
        step: 1,
        action: 'scenarioData.recordingStep1Action',
        script: 'scenarioData.recordingStep1Script',
        explanation: 'scenarioData.recordingStep1Explanation',
        copyable: true
      },
      {
        step: 2,
        action: 'scenarioData.recordingStep2Action',
        script: 'scenarioData.recordingStep2Script',
        explanation: 'scenarioData.recordingStep2Explanation',
        copyable: false
      },
      {
        step: 3,
        action: 'scenarioData.recordingStep3Action',
        script: 'scenarioData.recordingStep3Script',
        explanation: 'scenarioData.recordingStep3Explanation',
        copyable: true
      },
      {
        step: 4,
        action: 'scenarioData.recordingStep4Action',
        script: 'scenarioData.recordingStep4Script',
        explanation: 'scenarioData.recordingStep4Explanation',
        copyable: false
      },
      {
        step: 5,
        action: 'scenarioData.recordingStep5Action',
        script: 'scenarioData.recordingStep5Script',
        explanation: 'scenarioData.recordingStep5Explanation',
        copyable: false
      }
    ],
    studyContent: {
      overview: 'scenarioData.recordingOverview',
      keyPoints: [
        'scenarioData.recordingKeyPoint1',
        'scenarioData.recordingKeyPoint2',
        'scenarioData.recordingKeyPoint3',
        'scenarioData.recordingKeyPoint4',
        'scenarioData.recordingKeyPoint5',
        'scenarioData.recordingKeyPoint6'
      ],
      warrantTypes: {
        judicial: {
          title: 'scenarioData.recordingWarrantJudicialTitle',
          description: 'scenarioData.recordingWarrantJudicialDesc',
          icon: 'check',
          color: 'green'
        },
        administrative: {
          title: 'scenarioData.recordingWarrantAdminTitle',
          description: 'scenarioData.recordingWarrantAdminDesc',
          icon: 'alertTriangle',
          color: 'amber'
        }
      }
    }
  }
};

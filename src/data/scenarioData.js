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
        copyable: true,
        decision: {
          questionKey: 'scenarioData.doorDecision1Question',
          options: [
            {
              labelKey: 'scenarioData.doorDecision1OptionA',
              responseScript: 'scenarioData.doorBranch1aScript',
              responseExplanation: 'scenarioData.doorBranch1aExplanation',
              responseCopyable: false
            },
            {
              labelKey: 'scenarioData.doorDecision1OptionB',
              responseScript: 'scenarioData.doorBranch1bScript',
              responseExplanation: 'scenarioData.doorBranch1bExplanation',
              responseCopyable: false
            }
          ]
        }
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
        copyable: true,
        decision: {
          questionKey: 'scenarioData.doorDecision3Question',
          options: [
            {
              labelKey: 'scenarioData.doorDecision3OptionA',
              responseScript: 'scenarioData.doorBranch3aScript',
              responseExplanation: 'scenarioData.doorBranch3aExplanation',
              responseCopyable: true
            },
            {
              labelKey: 'scenarioData.doorDecision3OptionB',
              responseScript: 'scenarioData.doorBranch3bScript',
              responseExplanation: 'scenarioData.doorBranch3bExplanation',
              responseCopyable: true
            },
            {
              labelKey: 'scenarioData.doorDecision3OptionC',
              responseScript: 'scenarioData.doorBranch3cScript',
              responseExplanation: 'scenarioData.doorBranch3cExplanation',
              responseCopyable: true
            }
          ]
        }
      },
      {
        step: 4,
        action: 'scenarioData.doorStep4Action',
        script: 'scenarioData.doorStep4Script',
        explanation: 'scenarioData.doorStep4Explanation',
        copyable: true,
        decision: {
          questionKey: 'scenarioData.doorDecision4Question',
          options: [
            {
              labelKey: 'scenarioData.doorDecision4OptionA',
              responseScript: 'scenarioData.doorBranch4aScript',
              responseExplanation: 'scenarioData.doorBranch4aExplanation',
              responseCopyable: true
            },
            {
              labelKey: 'scenarioData.doorDecision4OptionB',
              responseScript: 'scenarioData.doorBranch4bScript',
              responseExplanation: 'scenarioData.doorBranch4bExplanation',
              responseCopyable: false
            }
          ]
        }
      },
      {
        step: 5,
        action: 'scenarioData.doorStep5Action',
        script: 'scenarioData.doorStep5Script',
        explanation: 'scenarioData.doorStep5Explanation',
        copyable: false
      },
      {
        step: 6,
        action: 'scenarioData.doorStep6Action',
        script: 'scenarioData.doorStep6Script',
        explanation: 'scenarioData.doorStep6Explanation',
        copyable: true
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
        copyable: true,
        decision: {
          questionKey: 'scenarioData.streetDecision1Question',
          options: [
            {
              labelKey: 'scenarioData.streetDecision1OptionA',
              responseScript: 'scenarioData.streetBranch1aScript',
              responseExplanation: 'scenarioData.streetBranch1aExplanation',
              responseCopyable: false
            },
            {
              labelKey: 'scenarioData.streetDecision1OptionB',
              responseScript: 'scenarioData.streetBranch1bScript',
              responseExplanation: 'scenarioData.streetBranch1bExplanation',
              responseCopyable: true
            },
            {
              labelKey: 'scenarioData.streetDecision1OptionC',
              responseScript: 'scenarioData.streetBranch1cScript',
              responseExplanation: 'scenarioData.streetBranch1cExplanation',
              responseCopyable: true
            }
          ]
        }
      },
      {
        step: 2,
        action: 'scenarioData.streetStep2Action',
        script: 'scenarioData.streetStep2Script',
        explanation: 'scenarioData.streetStep2Explanation',
        copyable: true,
        decision: {
          questionKey: 'scenarioData.streetDecision2Question',
          options: [
            {
              labelKey: 'scenarioData.streetDecision2OptionA',
              responseScript: 'scenarioData.streetBranch2aScript',
              responseExplanation: 'scenarioData.streetBranch2aExplanation',
              responseCopyable: true
            },
            {
              labelKey: 'scenarioData.streetDecision2OptionB',
              responseScript: 'scenarioData.streetBranch2bScript',
              responseExplanation: 'scenarioData.streetBranch2bExplanation',
              responseCopyable: false
            }
          ]
        }
      },
      {
        step: 3,
        action: 'scenarioData.streetStep3Action',
        script: 'scenarioData.streetStep3Script',
        explanation: 'scenarioData.streetStep3Explanation',
        copyable: true,
        decision: {
          questionKey: 'scenarioData.streetDecision3Question',
          options: [
            {
              labelKey: 'scenarioData.streetDecision3OptionA',
              responseScript: 'scenarioData.streetBranch3aScript',
              responseExplanation: 'scenarioData.streetBranch3aExplanation',
              responseCopyable: true
            },
            {
              labelKey: 'scenarioData.streetDecision3OptionB',
              responseScript: 'scenarioData.streetBranch3bScript',
              responseExplanation: 'scenarioData.streetBranch3bExplanation',
              responseCopyable: false
            }
          ]
        }
      },
      {
        step: 4,
        action: 'scenarioData.streetStep4Action',
        script: 'scenarioData.streetStep4Script',
        explanation: 'scenarioData.streetStep4Explanation',
        copyable: true,
        decision: {
          questionKey: 'scenarioData.streetDecision4Question',
          options: [
            {
              labelKey: 'scenarioData.streetDecision4OptionA',
              responseScript: 'scenarioData.streetBranch4aScript',
              responseExplanation: 'scenarioData.streetBranch4aExplanation',
              responseCopyable: true
            },
            {
              labelKey: 'scenarioData.streetDecision4OptionB',
              responseScript: 'scenarioData.streetBranch4bScript',
              responseExplanation: 'scenarioData.streetBranch4bExplanation',
              responseCopyable: true
            }
          ]
        }
      },
      {
        step: 5,
        action: 'scenarioData.streetStep5Action',
        script: 'scenarioData.streetStep5Script',
        explanation: 'scenarioData.streetStep5Explanation',
        copyable: false,
        decision: {
          questionKey: 'scenarioData.streetDecision5Question',
          options: [
            {
              labelKey: 'scenarioData.streetDecision5OptionA',
              responseScript: 'scenarioData.streetBranch5aScript',
              responseExplanation: 'scenarioData.streetBranch5aExplanation',
              responseCopyable: true
            },
            {
              labelKey: 'scenarioData.streetDecision5OptionB',
              responseScript: 'scenarioData.streetBranch5bScript',
              responseExplanation: 'scenarioData.streetBranch5bExplanation',
              responseCopyable: false
            }
          ]
        }
      },
      {
        step: 6,
        action: 'scenarioData.streetStep6Action',
        script: 'scenarioData.streetStep6Script',
        explanation: 'scenarioData.streetStep6Explanation',
        copyable: true
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
        copyable: true,
        decision: {
          questionKey: 'scenarioData.vehicleDecision2Question',
          options: [
            {
              labelKey: 'scenarioData.vehicleDecision2OptionA',
              responseScript: 'scenarioData.vehicleBranch2aScript',
              responseExplanation: 'scenarioData.vehicleBranch2aExplanation',
              responseCopyable: false
            },
            {
              labelKey: 'scenarioData.vehicleDecision2OptionB',
              responseScript: 'scenarioData.vehicleBranch2bScript',
              responseExplanation: 'scenarioData.vehicleBranch2bExplanation',
              responseCopyable: true
            }
          ]
        }
      },
      {
        step: 3,
        action: 'scenarioData.vehicleStep3Action',
        script: 'scenarioData.vehicleStep3Script',
        explanation: 'scenarioData.vehicleStep3Explanation',
        copyable: true,
        decision: {
          questionKey: 'scenarioData.vehicleDecision3Question',
          options: [
            {
              labelKey: 'scenarioData.vehicleDecision3OptionA',
              responseScript: 'scenarioData.vehicleBranch3aScript',
              responseExplanation: 'scenarioData.vehicleBranch3aExplanation',
              responseCopyable: true
            },
            {
              labelKey: 'scenarioData.vehicleDecision3OptionB',
              responseScript: 'scenarioData.vehicleBranch3bScript',
              responseExplanation: 'scenarioData.vehicleBranch3bExplanation',
              responseCopyable: true
            }
          ]
        }
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
        copyable: false,
        decision: {
          questionKey: 'scenarioData.vehicleDecision5Question',
          options: [
            {
              labelKey: 'scenarioData.vehicleDecision5OptionA',
              responseScript: 'scenarioData.vehicleBranch5aScript',
              responseExplanation: 'scenarioData.vehicleBranch5aExplanation',
              responseCopyable: true
            },
            {
              labelKey: 'scenarioData.vehicleDecision5OptionB',
              responseScript: 'scenarioData.vehicleBranch5bScript',
              responseExplanation: 'scenarioData.vehicleBranch5bExplanation',
              responseCopyable: true
            },
            {
              labelKey: 'scenarioData.vehicleDecision5OptionC',
              responseScript: 'scenarioData.vehicleBranch5cScript',
              responseExplanation: 'scenarioData.vehicleBranch5cExplanation',
              responseCopyable: false
            }
          ]
        }
      },
      {
        step: 6,
        action: 'scenarioData.vehicleStep6Action',
        script: 'scenarioData.vehicleStep6Script',
        explanation: 'scenarioData.vehicleStep6Explanation',
        copyable: true
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
        copyable: true,
        decision: {
          questionKey: 'scenarioData.borderDecision1Question',
          options: [
            {
              labelKey: 'scenarioData.borderDecision1OptionA',
              responseScript: 'scenarioData.borderBranch1aScript',
              responseExplanation: 'scenarioData.borderBranch1aExplanation',
              responseCopyable: false
            },
            {
              labelKey: 'scenarioData.borderDecision1OptionB',
              responseScript: 'scenarioData.borderBranch1bScript',
              responseExplanation: 'scenarioData.borderBranch1bExplanation',
              responseCopyable: true
            }
          ]
        }
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
        copyable: true,
        decision: {
          questionKey: 'scenarioData.borderDecision5Question',
          options: [
            {
              labelKey: 'scenarioData.borderDecision5OptionA',
              responseScript: 'scenarioData.borderBranch5aScript',
              responseExplanation: 'scenarioData.borderBranch5aExplanation',
              responseCopyable: true
            },
            {
              labelKey: 'scenarioData.borderDecision5OptionB',
              responseScript: 'scenarioData.borderBranch5bScript',
              responseExplanation: 'scenarioData.borderBranch5bExplanation',
              responseCopyable: true
            }
          ]
        }
      },
      {
        step: 6,
        action: 'scenarioData.borderStep6Action',
        script: 'scenarioData.borderStep6Script',
        explanation: 'scenarioData.borderStep6Explanation',
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
        copyable: true,
        decision: {
          questionKey: 'scenarioData.workplaceDecision3Question',
          options: [
            {
              labelKey: 'scenarioData.workplaceDecision3OptionA',
              responseScript: 'scenarioData.workplaceBranch3aScript',
              responseExplanation: 'scenarioData.workplaceBranch3aExplanation',
              responseCopyable: true
            },
            {
              labelKey: 'scenarioData.workplaceDecision3OptionB',
              responseScript: 'scenarioData.workplaceBranch3bScript',
              responseExplanation: 'scenarioData.workplaceBranch3bExplanation',
              responseCopyable: true
            }
          ]
        }
      },
      {
        step: 4,
        action: 'scenarioData.workplaceStep4Action',
        script: 'scenarioData.workplaceStep4Script',
        explanation: 'scenarioData.workplaceStep4Explanation',
        copyable: true,
        decision: {
          questionKey: 'scenarioData.workplaceDecision4Question',
          options: [
            {
              labelKey: 'scenarioData.workplaceDecision4OptionA',
              responseScript: 'scenarioData.workplaceBranch4aScript',
              responseExplanation: 'scenarioData.workplaceBranch4aExplanation',
              responseCopyable: false
            },
            {
              labelKey: 'scenarioData.workplaceDecision4OptionB',
              responseScript: 'scenarioData.workplaceBranch4bScript',
              responseExplanation: 'scenarioData.workplaceBranch4bExplanation',
              responseCopyable: true
            },
            {
              labelKey: 'scenarioData.workplaceDecision4OptionC',
              responseScript: 'scenarioData.workplaceBranch4cScript',
              responseExplanation: 'scenarioData.workplaceBranch4cExplanation',
              responseCopyable: true
            }
          ]
        }
      },
      {
        step: 5,
        action: 'scenarioData.workplaceStep5Action',
        script: 'scenarioData.workplaceStep5Script',
        explanation: 'scenarioData.workplaceStep5Explanation',
        copyable: false,
        decision: {
          questionKey: 'scenarioData.workplaceDecision5Question',
          options: [
            {
              labelKey: 'scenarioData.workplaceDecision5OptionA',
              responseScript: 'scenarioData.workplaceBranch5aScript',
              responseExplanation: 'scenarioData.workplaceBranch5aExplanation',
              responseCopyable: true
            },
            {
              labelKey: 'scenarioData.workplaceDecision5OptionB',
              responseScript: 'scenarioData.workplaceBranch5bScript',
              responseExplanation: 'scenarioData.workplaceBranch5bExplanation',
              responseCopyable: true
            }
          ]
        }
      },
      {
        step: 6,
        action: 'scenarioData.workplaceStep6Action',
        script: 'scenarioData.workplaceStep6Script',
        explanation: 'scenarioData.workplaceStep6Explanation',
        copyable: true
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
        copyable: false,
        decision: {
          questionKey: 'scenarioData.protestDecision2Question',
          options: [
            {
              labelKey: 'scenarioData.protestDecision2OptionA',
              responseScript: 'scenarioData.protestBranch2aScript',
              responseExplanation: 'scenarioData.protestBranch2aExplanation',
              responseCopyable: true
            },
            {
              labelKey: 'scenarioData.protestDecision2OptionB',
              responseScript: 'scenarioData.protestBranch2bScript',
              responseExplanation: 'scenarioData.protestBranch2bExplanation',
              responseCopyable: true
            },
            {
              labelKey: 'scenarioData.protestDecision2OptionC',
              responseScript: 'scenarioData.protestBranch2cScript',
              responseExplanation: 'scenarioData.protestBranch2cExplanation',
              responseCopyable: false
            }
          ]
        }
      },
      {
        step: 3,
        action: 'scenarioData.protestStep3Action',
        script: 'scenarioData.protestStep3Script',
        explanation: 'scenarioData.protestStep3Explanation',
        copyable: true,
        decision: {
          questionKey: 'scenarioData.protestDecision3Question',
          options: [
            {
              labelKey: 'scenarioData.protestDecision3OptionA',
              responseScript: 'scenarioData.protestBranch3aScript',
              responseExplanation: 'scenarioData.protestBranch3aExplanation',
              responseCopyable: false
            },
            {
              labelKey: 'scenarioData.protestDecision3OptionB',
              responseScript: 'scenarioData.protestBranch3bScript',
              responseExplanation: 'scenarioData.protestBranch3bExplanation',
              responseCopyable: true
            },
            {
              labelKey: 'scenarioData.protestDecision3OptionC',
              responseScript: 'scenarioData.protestBranch3cScript',
              responseExplanation: 'scenarioData.protestBranch3cExplanation',
              responseCopyable: true
            }
          ]
        }
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
        copyable: true,
        decision: {
          questionKey: 'scenarioData.protestDecision5Question',
          options: [
            {
              labelKey: 'scenarioData.protestDecision5OptionA',
              responseScript: 'scenarioData.protestBranch5aScript',
              responseExplanation: 'scenarioData.protestBranch5aExplanation',
              responseCopyable: true
            },
            {
              labelKey: 'scenarioData.protestDecision5OptionB',
              responseScript: 'scenarioData.protestBranch5bScript',
              responseExplanation: 'scenarioData.protestBranch5bExplanation',
              responseCopyable: true
            }
          ]
        }
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

  'sensitive-locations': {
    id: 'sensitive-locations',
    icon: 'mapPin',
    title: 'scenarioData.sensitiveTitle',
    description: 'scenarioData.sensitiveDesc',
    emergencyScript: [
      {
        step: 1,
        action: 'scenarioData.sensitiveStep1Action',
        script: 'scenarioData.sensitiveStep1Script',
        explanation: 'scenarioData.sensitiveStep1Explanation',
        copyable: true,
        decision: {
          questionKey: 'scenarioData.sensitiveDecision1Question',
          options: [
            {
              labelKey: 'scenarioData.sensitiveDecision1OptionA',
              responseScript: 'scenarioData.sensitiveBranch1aScript',
              responseExplanation: 'scenarioData.sensitiveBranch1aExplanation',
              responseCopyable: true
            },
            {
              labelKey: 'scenarioData.sensitiveDecision1OptionB',
              responseScript: 'scenarioData.sensitiveBranch1bScript',
              responseExplanation: 'scenarioData.sensitiveBranch1bExplanation',
              responseCopyable: true
            },
            {
              labelKey: 'scenarioData.sensitiveDecision1OptionC',
              responseScript: 'scenarioData.sensitiveBranch1cScript',
              responseExplanation: 'scenarioData.sensitiveBranch1cExplanation',
              responseCopyable: true
            },
            {
              labelKey: 'scenarioData.sensitiveDecision1OptionD',
              responseScript: 'scenarioData.sensitiveBranch1dScript',
              responseExplanation: 'scenarioData.sensitiveBranch1dExplanation',
              responseCopyable: true
            }
          ]
        }
      },
      {
        step: 2,
        action: 'scenarioData.sensitiveStep2Action',
        script: 'scenarioData.sensitiveStep2Script',
        explanation: 'scenarioData.sensitiveStep2Explanation',
        copyable: true
      },
      {
        step: 3,
        action: 'scenarioData.sensitiveStep3Action',
        script: 'scenarioData.sensitiveStep3Script',
        explanation: 'scenarioData.sensitiveStep3Explanation',
        copyable: false
      },
      {
        step: 4,
        action: 'scenarioData.sensitiveStep4Action',
        script: 'scenarioData.sensitiveStep4Script',
        explanation: 'scenarioData.sensitiveStep4Explanation',
        copyable: true
      },
      {
        step: 5,
        action: 'scenarioData.sensitiveStep5Action',
        script: 'scenarioData.sensitiveStep5Script',
        explanation: 'scenarioData.sensitiveStep5Explanation',
        copyable: false
      }
    ],
    studyContent: {
      overview: 'scenarioData.sensitiveOverview',
      keyPoints: [
        'scenarioData.sensitiveKeyPoint1',
        'scenarioData.sensitiveKeyPoint2',
        'scenarioData.sensitiveKeyPoint3',
        'scenarioData.sensitiveKeyPoint4',
        'scenarioData.sensitiveKeyPoint5',
        'scenarioData.sensitiveKeyPoint6'
      ],
      warrantTypes: {
        judicial: {
          title: 'scenarioData.sensitiveWarrantJudicialTitle',
          description: 'scenarioData.sensitiveWarrantJudicialDesc',
          icon: 'alertTriangle',
          color: 'red'
        },
        administrative: {
          title: 'scenarioData.sensitiveWarrantAdminTitle',
          description: 'scenarioData.sensitiveWarrantAdminDesc',
          icon: 'check',
          color: 'amber'
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
        copyable: true,
        decision: {
          questionKey: 'scenarioData.recordingDecision3Question',
          options: [
            {
              labelKey: 'scenarioData.recordingDecision3OptionA',
              responseScript: 'scenarioData.recordingBranch3aScript',
              responseExplanation: 'scenarioData.recordingBranch3aExplanation',
              responseCopyable: true
            },
            {
              labelKey: 'scenarioData.recordingDecision3OptionB',
              responseScript: 'scenarioData.recordingBranch3bScript',
              responseExplanation: 'scenarioData.recordingBranch3bExplanation',
              responseCopyable: true
            },
            {
              labelKey: 'scenarioData.recordingDecision3OptionC',
              responseScript: 'scenarioData.recordingBranch3cScript',
              responseExplanation: 'scenarioData.recordingBranch3cExplanation',
              responseCopyable: true
            }
          ]
        }
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

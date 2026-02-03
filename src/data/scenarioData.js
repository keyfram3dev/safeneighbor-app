export const scenarios = {
  door: {
    id: 'door',
    icon: 'home',
    title: 'ICE Is At My Door',
    description: 'Step-by-step scripts to speak through the door without opening it.',
    emergencyScript: [
      {
        step: 1,
        action: 'DO NOT OPEN THE DOOR',
        script: 'Who is it? What do you want?',
        explanation: 'Never open the door. Speak through it.',
        copyable: true
      },
      {
        step: 2,
        action: 'ASK FOR IDENTIFICATION',
        script: 'Please slide your identification under the door or hold it up to the window.',
        explanation: 'You have the right to verify who they are.',
        copyable: true
      },
      {
        step: 3,
        action: 'DEMAND A WARRANT',
        script: 'Do you have a warrant signed by a judge? Please slide it under the door.',
        explanation: 'ICE needs a judicial warrant (signed by a judge) to enter. An administrative warrant is NOT enough.',
        copyable: true
      },
      {
        step: 4,
        action: 'ASSERT YOUR RIGHTS',
        script: 'I do not consent to you entering my home. I am exercising my right to remain silent and want to speak to a lawyer.',
        explanation: '5th Amendment protects your right to remain silent.',
        copyable: true
      },
      {
        step: 5,
        action: 'DOCUMENT THE ENCOUNTER',
        script: 'Start recording audio/video through a window if safe to do so.',
        explanation: 'You have the right to document law enforcement at your door.',
        copyable: false
      }
    ],
    studyContent: {
      overview: 'ICE cannot enter your home without a judicial warrant signed by a judge. You have constitutional rights that protect you.',
      keyPoints: [
        '✓ Never open the door',
        '✓ Ask to see the warrant through the door/window',
        '✓ Check if the warrant is signed by a judge (judicial) vs. an ICE officer (administrative)',
        '✓ Administrative warrants do NOT give ICE permission to enter your home',
        '✓ You have the right to remain silent',
        '✓ You can refuse to answer questions'
      ],
      warrantTypes: {
        judicial: {
          title: 'Judicial Warrant (Judge-Signed)',
          description: 'Allows ICE to enter your home',
          icon: 'scale',
          color: 'red'
        },
        administrative: {
          title: 'Administrative Warrant (ICE-Signed)',
          description: 'Does NOT allow entry to your home',
          icon: 'fileText',
          color: 'amber'
        }
      }
    }
  },

  street: {
    id: 'street',
    icon: 'user',
    title: 'Stopped on the Street',
    description: 'Are you free to leave? How to exercise silence in public.',
    emergencyScript: [
      {
        step: 1,
        action: 'ASK IF YOU ARE FREE TO LEAVE',
        script: 'Am I free to leave?',
        explanation: 'This is the most important question. If they say yes, calmly walk away.',
        copyable: true
      },
      {
        step: 2,
        action: 'DO NOT ANSWER QUESTIONS',
        script: 'I am exercising my right to remain silent. I do not wish to answer any questions.',
        explanation: 'You have the 5th Amendment right to remain silent.',
        copyable: true
      },
      {
        step: 3,
        action: 'DO NOT CONSENT TO SEARCHES',
        script: 'I do not consent to any searches.',
        explanation: '4th Amendment protects against unreasonable searches.',
        copyable: true
      },
      {
        step: 4,
        action: 'REQUEST A LAWYER',
        script: 'I want to speak to a lawyer.',
        explanation: 'You have the right to legal representation.',
        copyable: true
      },
      {
        step: 5,
        action: 'STAY CALM',
        script: 'Keep your hands visible. Do not run. Remain calm and respectful.',
        explanation: 'De-escalation is key to your safety.',
        copyable: false
      }
    ],
    studyContent: {
      overview: 'In public spaces, ICE may approach you. You have the right to remain silent and the right to ask if you are free to leave. Do not run, lie, or show false documents.',
      keyPoints: [
        '✓ Always ask "Am I free to leave?"',
        '✓ You have the right to remain silent',
        '✓ You do not have to answer questions about your immigration status',
        '✓ Do not run or physically resist',
        '✓ Do not lie or provide false documents',
        '✓ Stay calm and keep hands visible'
      ],
      warrantTypes: {
        judicial: {
          title: 'What You Can Do',
          description: 'Ask if you are free to leave. Exercise your right to silence. Request a lawyer.',
          icon: 'check',
          color: 'green'
        },
        administrative: {
          title: 'What NOT to Do',
          description: 'Do not run. Do not lie. Do not show false documents. Do not physically resist.',
          icon: 'x',
          color: 'red'
        }
      }
    }
  },

  vehicle: {
    id: 'vehicle',
    icon: 'car',
    title: 'Vehicle Stops',
    description: 'Rights during ICE traffic stops. Warrant vs consent.',
    emergencyScript: [
      {
        step: 1,
        action: 'STAY IN THE VEHICLE',
        script: 'Keep your hands on the steering wheel. Turn on interior lights if nighttime.',
        explanation: 'Stay calm and visible. Do not make sudden movements.',
        copyable: false
      },
      {
        step: 2,
        action: 'ASK WHY YOU WERE STOPPED',
        script: 'Why did you stop me?',
        explanation: 'You have the right to know the reason for the stop.',
        copyable: true
      },
      {
        step: 3,
        action: 'PROVIDE DRIVER LICENSE AND REGISTRATION',
        script: 'Here is my driver license and registration.',
        explanation: 'You must provide these documents if driving. Tell officer before reaching for them.',
        copyable: true
      },
      {
        step: 4,
        action: 'ASSERT YOUR RIGHTS',
        script: 'I am exercising my right to remain silent. I do not consent to any searches. I want to speak to a lawyer.',
        explanation: 'You do not have to answer questions beyond providing license and registration.',
        copyable: true
      },
      {
        step: 5,
        action: 'IF ASKED TO EXIT',
        script: 'Lock your car and do not consent to searches. You can take a video through the window.',
        explanation: 'If asked to exit, you must comply, but you can refuse searches.',
        copyable: false
      }
    ],
    studyContent: {
      overview: 'During a traffic stop, you must provide your driver license and vehicle registration. However, you have the right to remain silent beyond that. You do not have to consent to vehicle searches.',
      keyPoints: [
        '✓ Keep hands visible on steering wheel',
        '✓ Provide license and registration when asked',
        '✓ Tell officer before reaching for documents',
        '✓ You can remain silent beyond basic identification',
        '✓ You can refuse consent to vehicle searches',
        '✓ Passengers can ask if they are free to leave'
      ],
      warrantTypes: {
        judicial: {
          title: 'Search Warrant Required',
          description: 'ICE needs a warrant to search your vehicle without your consent.',
          icon: 'scale',
          color: 'red'
        },
        administrative: {
          title: 'Never Consent',
          description: 'Clearly state: "I do not consent to any searches."',
          icon: 'ban',
          color: 'amber'
        }
      }
    }
  },

  border: {
    id: 'border',
    icon: 'shield',
    title: 'Border Crossing',
    description: 'Rights at ports of entry and internal checkpoints.',
    emergencyScript: [
      {
        step: 1,
        action: 'UNDERSTAND THE DIFFERENCE',
        script: 'Port of Entry vs. Internal Checkpoint - different rules apply.',
        explanation: 'At the actual border, you have limited rights. At internal checkpoints (within 100 miles), you have more protections.',
        copyable: false
      },
      {
        step: 2,
        action: 'AT PORT OF ENTRY',
        script: 'Answer basic questions about citizenship. You may be subject to searches.',
        explanation: 'At the border itself, CBP has broad authority.',
        copyable: false
      },
      {
        step: 3,
        action: 'AT INTERNAL CHECKPOINTS',
        script: 'You do not have to answer questions beyond citizenship. You can remain silent.',
        explanation: 'Internal checkpoints (within US) have different rules.',
        copyable: true
      },
      {
        step: 4,
        action: 'ASSERT YOUR RIGHTS',
        script: 'Am I being detained or am I free to go? I am exercising my right to remain silent.',
        explanation: 'At internal checkpoints, you can assert 5th Amendment rights.',
        copyable: true
      },
      {
        step: 5,
        action: 'DO NOT CONSENT TO SEARCHES',
        script: 'I do not consent to any searches of my vehicle.',
        explanation: 'Even at checkpoints, you can refuse consent to searches.',
        copyable: true
      }
    ],
    studyContent: {
      overview: 'There are two types of border encounters: actual ports of entry (the border itself) and internal checkpoints (within 100 miles of border). Your rights differ at each location.',
      keyPoints: [
        '✓ At ports of entry: Limited rights, must answer citizenship questions',
        '✓ At internal checkpoints: More rights, can remain silent beyond citizenship',
        '✓ Do not lie about citizenship status',
        '✓ You can refuse to show documents beyond driver license when driving',
        '✓ You can refuse consent to vehicle searches',
        '✓ Document the encounter if safe to do so'
      ],
      warrantTypes: {
        judicial: {
          title: 'Port of Entry (Border)',
          description: 'Limited rights. CBP has broad search authority. Answer basic questions.',
          icon: 'construction',
          color: 'red'
        },
        administrative: {
          title: 'Internal Checkpoint',
          description: 'More rights. Can remain silent. Can refuse searches without warrant.',
          icon: 'check',
          color: 'green'
        }
      }
    }
  },

  workplace: {
    id: 'workplace',
    icon: 'building2',
    title: 'Workplace Inquiry',
    description: "ICE visits to employment sites. Don't run, stay silent.",
    emergencyScript: [
      {
        step: 1,
        action: 'STAY CALM - DO NOT RUN',
        script: 'Running can be used against you. Stay where you are.',
        explanation: 'Fleeing can be used as evidence. Remain calm.',
        copyable: false
      },
      {
        step: 2,
        action: 'ASSERT YOUR RIGHTS',
        script: 'I am exercising my right to remain silent. I want to speak to a lawyer.',
        explanation: 'You have the right to remain silent at work.',
        copyable: true
      },
      {
        step: 3,
        action: 'DO NOT SHOW DOCUMENTS',
        script: 'I do not consent to showing any documents without a lawyer present.',
        explanation: 'You do not have to show work authorization documents to ICE.',
        copyable: true
      },
      {
        step: 4,
        action: 'ASK IF YOU CAN LEAVE',
        script: 'Am I free to leave?',
        explanation: 'You may be able to leave if not detained.',
        copyable: true
      },
      {
        step: 5,
        action: 'KNOW YOUR WORKPLACE RIGHTS',
        script: 'ICE needs a judicial warrant to enter non-public areas of the workplace.',
        explanation: 'Private areas of workplace have same protections as a home.',
        copyable: false
      }
    ],
    studyContent: {
      overview: 'ICE may visit workplaces. In public areas, they have more access. In private/non-public areas, they need a judicial warrant. You have the right to remain silent and ask for a lawyer.',
      keyPoints: [
        '✓ Do not run - remain calm',
        '✓ Exercise your right to remain silent',
        '✓ Do not show documents without a lawyer',
        '✓ Ask if you are free to leave',
        '✓ ICE needs a judicial warrant for non-public workplace areas',
        '✓ You can refuse to answer questions'
      ],
      warrantTypes: {
        judicial: {
          title: 'Non-Public Areas',
          description: 'ICE needs a judicial warrant to enter private workplace areas (break rooms, offices).',
          icon: 'scale',
          color: 'green'
        },
        administrative: {
          title: 'Public Areas',
          description: 'ICE may access public areas (lobby, customer areas) without a warrant.',
          icon: 'doorOpen',
          color: 'amber'
        }
      }
    }
  },

  protest: {
    id: 'protest',
    icon: 'megaphone',
    title: 'Protesting Rights',
    description: 'Best practices and legal boundaries for peaceful assembly.',
    emergencyScript: [
      {
        step: 1,
        action: 'KNOW YOUR RIGHTS',
        script: 'I am peacefully exercising my First Amendment right to assemble.',
        explanation: 'The First Amendment protects peaceful protest in public spaces.',
        copyable: true
      },
      {
        step: 2,
        action: 'STAY ON PUBLIC PROPERTY',
        script: 'Remain on sidewalks, parks, and public plazas. Do not block entrances or traffic.',
        explanation: 'Public spaces are protected. Private property requires permission.',
        copyable: false
      },
      {
        step: 3,
        action: 'IF POLICE APPROACH',
        script: 'I am exercising my constitutional right to peaceful assembly. Am I being detained or am I free to go?',
        explanation: 'Calmly assert your rights. Ask if you are being detained.',
        copyable: true
      },
      {
        step: 4,
        action: 'IF GIVEN DISPERSAL ORDER',
        script: 'Note the time, reason given, and comply. Document everything.',
        explanation: 'Failure to disperse after a lawful order can result in arrest.',
        copyable: false
      },
      {
        step: 5,
        action: 'IF ARRESTED',
        script: 'I am exercising my right to remain silent. I want a lawyer.',
        explanation: 'Do not resist. Go limp if necessary. Assert your rights verbally.',
        copyable: true
      }
    ],
    studyContent: {
      overview: 'The First Amendment protects your right to peacefully assemble and protest. This includes marches, rallies, and demonstrations in public spaces. However, there are legal boundaries you should understand.',
      keyPoints: [
        '✓ You can protest on public sidewalks and parks',
        '✓ You can photograph and record at protests',
        '✓ Police cannot prevent you from protesting based on content',
        '✓ You may need permits for large gatherings or blocking streets',
        '✓ Counter-protesters have the same rights as you',
        '✓ You can be arrested for blocking traffic or trespassing'
      ],
      warrantTypes: {
        judicial: {
          title: 'Protected Activities',
          description: 'Peaceful assembly, carrying signs, chanting, marching on sidewalks, recording.',
          icon: 'check',
          color: 'green'
        },
        administrative: {
          title: 'Not Protected',
          description: 'Violence, property destruction, blocking emergency vehicles, trespassing.',
          icon: 'x',
          color: 'red'
        }
      }
    }
  },

  recording: {
    id: 'recording',
    icon: 'video',
    title: 'Recording Rights',
    description: 'When and how you can legally document ICE activity.',
    emergencyScript: [
      {
        step: 1,
        action: 'KNOW YOUR RIGHT',
        script: 'I am exercising my First Amendment right to record in a public space.',
        explanation: 'Recording police and ICE in public is constitutionally protected.',
        copyable: true
      },
      {
        step: 2,
        action: 'MAINTAIN DISTANCE',
        script: 'Stay at least 10 feet away. Do not interfere with their activities.',
        explanation: 'You can record but cannot obstruct law enforcement duties.',
        copyable: false
      },
      {
        step: 3,
        action: 'IF TOLD TO STOP',
        script: 'I am not interfering. I am recording from a public space which is my constitutional right.',
        explanation: 'Calmly assert your rights. Do not argue or become confrontational.',
        copyable: true
      },
      {
        step: 4,
        action: 'PROTECT YOUR FOOTAGE',
        script: 'Use apps that auto-upload to cloud. Do not delete footage if asked.',
        explanation: 'Officers cannot legally force you to delete recordings or seize your phone without a warrant.',
        copyable: false
      },
      {
        step: 5,
        action: 'DOCUMENT EVERYTHING',
        script: 'Note: time, location, badge numbers, agency, vehicle descriptions, and what actions were taken.',
        explanation: 'This information helps protect community members and holds agencies accountable.',
        copyable: false
      }
    ],
    studyContent: {
      overview: 'The First Amendment protects your right to record police and ICE agents in public spaces. This includes sidewalks, parks, and other public areas. You cannot be arrested simply for recording, but you must not interfere with their duties.',
      keyPoints: [
        '✓ You CAN record law enforcement in public spaces',
        '✓ Keep a safe distance (10+ feet recommended)',
        '✓ Do not physically interfere with operations',
        '✓ Officers cannot delete your recordings',
        '✓ Officers need a warrant to seize your phone',
        '✓ Back up footage to the cloud immediately'
      ],
      warrantTypes: {
        judicial: {
          title: 'Your Rights',
          description: 'Record openly in public. Assert your First Amendment rights. Back up footage to cloud.',
          icon: 'check',
          color: 'green'
        },
        administrative: {
          title: 'Limitations',
          description: 'Do not interfere. Do not trespass on private property. Do not obstruct operations.',
          icon: 'alertTriangle',
          color: 'amber'
        }
      }
    }
  }
};
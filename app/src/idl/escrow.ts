/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/escrow.json`.
 */
export type Escrow = {
  "address": "6KsiGDi8o9E1qNWxpzdew2CkDyQFqfeoLs79fAJ457D8",
  "metadata": {
    "name": "escrow",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "acceptJob",
      "discriminator": [
        43,
        201,
        124,
        1,
        19,
        189,
        96,
        10
      ],
      "accounts": [
        {
          "name": "freelancer",
          "signer": true,
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "escrow",
          "writable": true
        },
        {
          "name": "mint",
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "escrow"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "freelancerToken",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "expectedAmount",
          "type": "u64"
        },
        {
          "name": "expectedBondAmount",
          "type": "u64"
        },
        {
          "name": "expectedDeadlineTs",
          "type": "i64"
        },
        {
          "name": "expectedReviewWindowSecs",
          "type": "u64"
        },
        {
          "name": "expectedDisputeWindowSecs",
          "type": "u64"
        }
      ]
    },
    {
      "name": "acceptSettlement",
      "discriminator": [
        203,
        247,
        191,
        177,
        25,
        90,
        88,
        75
      ],
      "accounts": [
        {
          "name": "signer",
          "signer": true
        },
        {
          "name": "escrow",
          "writable": true
        },
        {
          "name": "mint",
          "docs": [
            "Mutable because the decay burn lowers the mint's supply."
          ],
          "writable": true,
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "escrow"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "freelancerToken",
          "writable": true
        },
        {
          "name": "clientToken",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "freelancerBps",
          "type": "u16"
        }
      ]
    },
    {
      "name": "burnIfUnsettled",
      "discriminator": [
        28,
        50,
        89,
        71,
        233,
        144,
        231,
        29
      ],
      "accounts": [
        {
          "name": "payer",
          "signer": true
        },
        {
          "name": "escrow",
          "writable": true
        },
        {
          "name": "mint",
          "writable": true,
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "escrow"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "cancelByFreelancer",
      "discriminator": [
        204,
        196,
        181,
        169,
        10,
        108,
        184,
        52
      ],
      "accounts": [
        {
          "name": "freelancer",
          "signer": true,
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "escrow",
          "writable": true
        },
        {
          "name": "mint",
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "escrow"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "clientToken",
          "writable": true
        },
        {
          "name": "freelancerToken",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "claimIfSilent",
      "discriminator": [
        106,
        229,
        205,
        76,
        19,
        98,
        217,
        234
      ],
      "accounts": [
        {
          "name": "caller",
          "docs": [
            "Anyone can trigger the payout; it can only go to the freelancer's account."
          ],
          "signer": true
        },
        {
          "name": "escrow",
          "writable": true
        },
        {
          "name": "mint",
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "escrow"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "freelancerToken",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "claimWithKey",
      "discriminator": [
        82,
        77,
        109,
        212,
        218,
        44,
        185,
        86
      ],
      "accounts": [
        {
          "name": "caller",
          "signer": true
        },
        {
          "name": "escrow",
          "writable": true
        },
        {
          "name": "mint",
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "escrow"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "freelancerToken",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "key",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "closeEscrow",
      "discriminator": [
        139,
        171,
        94,
        146,
        191,
        91,
        144,
        50
      ],
      "accounts": [
        {
          "name": "client",
          "docs": [
            "Receives the rent of both the vault and the escrow account."
          ],
          "writable": true,
          "signer": true,
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "escrow",
          "writable": true
        },
        {
          "name": "mint",
          "docs": [
            "Mutable because leftover dust is burned."
          ],
          "writable": true,
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "escrow"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "create",
      "discriminator": [
        24,
        30,
        200,
        40,
        5,
        28,
        7,
        119
      ],
      "accounts": [
        {
          "name": "client",
          "writable": true,
          "signer": true
        },
        {
          "name": "freelancer"
        },
        {
          "name": "mint"
        },
        {
          "name": "clientToken",
          "writable": true
        },
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "client"
              },
              {
                "kind": "arg",
                "path": "id"
              }
            ]
          }
        },
        {
          "name": "vault",
          "docs": [
            "Vault: ATA owned by the escrow PDA, so only this program can sign for it."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "escrow"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "id",
          "type": "u64"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "deadlineTs",
          "type": "i64"
        },
        {
          "name": "reviewWindowSecs",
          "type": "u64"
        },
        {
          "name": "disputeWindowSecs",
          "type": "u64"
        },
        {
          "name": "bondBps",
          "type": "u16"
        }
      ]
    },
    {
      "name": "markDelivered",
      "discriminator": [
        240,
        118,
        188,
        142,
        64,
        85,
        107,
        18
      ],
      "accounts": [
        {
          "name": "freelancer",
          "signer": true,
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "escrow",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "deliverableHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "keyHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "proposeSettlement",
      "discriminator": [
        228,
        149,
        56,
        61,
        137,
        43,
        106,
        25
      ],
      "accounts": [
        {
          "name": "signer",
          "signer": true
        },
        {
          "name": "escrow",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "freelancerBps",
          "type": "u16"
        }
      ]
    },
    {
      "name": "refundIfLate",
      "discriminator": [
        87,
        43,
        172,
        36,
        87,
        143,
        74,
        239
      ],
      "accounts": [
        {
          "name": "caller",
          "docs": [
            "Anyone can trigger the refund; it can only go to the client's account."
          ],
          "signer": true
        },
        {
          "name": "escrow",
          "writable": true
        },
        {
          "name": "mint",
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "escrow"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "clientToken",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "refundUnrevealed",
      "discriminator": [
        251,
        241,
        202,
        90,
        170,
        175,
        49,
        239
      ],
      "accounts": [
        {
          "name": "caller",
          "signer": true
        },
        {
          "name": "escrow",
          "writable": true
        },
        {
          "name": "mint",
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "escrow"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "clientToken",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "reject",
      "discriminator": [
        135,
        7,
        63,
        85,
        131,
        114,
        111,
        224
      ],
      "accounts": [
        {
          "name": "client",
          "signer": true,
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "escrow",
          "writable": true
        },
        {
          "name": "mint",
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "escrow"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "clientToken",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "release",
      "discriminator": [
        253,
        249,
        15,
        206,
        28,
        127,
        193,
        241
      ],
      "accounts": [
        {
          "name": "client",
          "signer": true,
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "escrow",
          "writable": true
        },
        {
          "name": "mint",
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "escrow"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "freelancerToken",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "withdraw",
      "discriminator": [
        183,
        18,
        70,
        156,
        148,
        109,
        161,
        34
      ],
      "accounts": [
        {
          "name": "client",
          "signer": true,
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "escrow",
          "writable": true
        },
        {
          "name": "mint",
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "escrow"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "clientToken",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "escrow",
      "discriminator": [
        31,
        213,
        123,
        187,
        186,
        22,
        218,
        155
      ]
    }
  ],
  "events": [
    {
      "name": "approved",
      "discriminator": [
        17,
        224,
        150,
        137,
        174,
        104,
        7,
        91
      ]
    },
    {
      "name": "burned",
      "discriminator": [
        207,
        37,
        251,
        154,
        239,
        229,
        14,
        67
      ]
    },
    {
      "name": "cancelled",
      "discriminator": [
        136,
        23,
        42,
        65,
        143,
        233,
        234,
        46
      ]
    },
    {
      "name": "closed",
      "discriminator": [
        50,
        31,
        87,
        155,
        135,
        220,
        195,
        239
      ]
    },
    {
      "name": "delivered",
      "discriminator": [
        148,
        178,
        60,
        250,
        87,
        49,
        149,
        65
      ]
    },
    {
      "name": "escrowCreated",
      "discriminator": [
        70,
        127,
        105,
        102,
        92,
        97,
        7,
        173
      ]
    },
    {
      "name": "jobAccepted",
      "discriminator": [
        47,
        54,
        152,
        59,
        118,
        195,
        251,
        114
      ]
    },
    {
      "name": "keyRevealed",
      "discriminator": [
        244,
        165,
        218,
        72,
        102,
        23,
        245,
        234
      ]
    },
    {
      "name": "refunded",
      "discriminator": [
        35,
        103,
        149,
        246,
        196,
        123,
        221,
        99
      ]
    },
    {
      "name": "rejected",
      "discriminator": [
        119,
        30,
        67,
        78,
        53,
        53,
        23,
        31
      ]
    },
    {
      "name": "released",
      "discriminator": [
        232,
        229,
        255,
        136,
        101,
        189,
        15,
        220
      ]
    },
    {
      "name": "settled",
      "discriminator": [
        232,
        210,
        40,
        17,
        142,
        124,
        145,
        238
      ]
    },
    {
      "name": "settlementProposed",
      "discriminator": [
        139,
        32,
        64,
        205,
        27,
        154,
        100,
        147
      ]
    },
    {
      "name": "withdrawn",
      "discriminator": [
        20,
        89,
        223,
        198,
        194,
        124,
        219,
        13
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidAmount",
      "msg": "Amount must be greater than zero"
    },
    {
      "code": 6001,
      "name": "deadlineInPast",
      "msg": "Deadline must be in the future"
    },
    {
      "code": 6002,
      "name": "invalidState",
      "msg": "Escrow is not in a state that allows this instruction"
    },
    {
      "code": 6003,
      "name": "unauthorized",
      "msg": "Signer is not the party allowed to call this instruction"
    },
    {
      "code": 6004,
      "name": "deadlinePassed",
      "msg": "Delivery deadline has already passed"
    },
    {
      "code": 6005,
      "name": "deadlineNotReached",
      "msg": "Delivery deadline has not passed yet"
    },
    {
      "code": 6006,
      "name": "reviewWindowOpen",
      "msg": "Review window is still open"
    },
    {
      "code": 6007,
      "name": "reviewWindowClosed",
      "msg": "Review window has already closed"
    },
    {
      "code": 6008,
      "name": "notDelivered",
      "msg": "Escrow has no delivery timestamp"
    },
    {
      "code": 6009,
      "name": "invalidDisputeWindow",
      "msg": "Dispute window must be greater than zero"
    },
    {
      "code": 6010,
      "name": "invalidBps",
      "msg": "Settlement share must be at most 10000 basis points"
    },
    {
      "code": 6011,
      "name": "disputeWindowOpen",
      "msg": "Dispute window is still open"
    },
    {
      "code": 6012,
      "name": "disputeWindowClosed",
      "msg": "Dispute window has already closed"
    },
    {
      "code": 6013,
      "name": "noProposal",
      "msg": "No settlement has been proposed"
    },
    {
      "code": 6014,
      "name": "proposerCannotAccept",
      "msg": "The proposer cannot accept their own settlement"
    },
    {
      "code": 6015,
      "name": "settlementMismatch",
      "msg": "Accepted share does not match the proposed one"
    },
    {
      "code": 6016,
      "name": "vaultNotEmpty",
      "msg": "Vault still holds tokens"
    },
    {
      "code": 6017,
      "name": "unsupportedMint",
      "msg": "This mint is not supported (Token-2022 extension outside the allow-list)"
    },
    {
      "code": 6018,
      "name": "termsMismatch",
      "msg": "The escrow terms differ from what the freelancer agreed to"
    },
    {
      "code": 6019,
      "name": "sameParty",
      "msg": "Client and freelancer must be different wallets"
    },
    {
      "code": 6020,
      "name": "windowTooLong",
      "msg": "A deadline or window is longer than the 90 day maximum"
    },
    {
      "code": 6021,
      "name": "invalidReviewWindow",
      "msg": "Review window must be greater than zero"
    },
    {
      "code": 6022,
      "name": "invalidKey",
      "msg": "The revealed key does not match the committed key hash"
    },
    {
      "code": 6023,
      "name": "sealedDeliveryUseKey",
      "msg": "This delivery is sealed: claim it by revealing the key (claim_with_key)"
    },
    {
      "code": 6024,
      "name": "notSealed",
      "msg": "This delivery is not sealed"
    }
  ],
  "types": [
    {
      "name": "approved",
      "docs": [
        "The client approved a sealed delivery (or conceded a dispute over one). No money",
        "moved yet: the freelancer is paid in the transaction that reveals the key."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "escrow",
            "type": "pubkey"
          },
          {
            "name": "approvedAt",
            "type": "i64"
          },
          {
            "name": "conceded",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "burned",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "escrow",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "cancelled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "escrow",
            "type": "pubkey"
          },
          {
            "name": "toClient",
            "type": "u64"
          },
          {
            "name": "toFreelancer",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "closed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "escrow",
            "type": "pubkey"
          },
          {
            "name": "dustBurned",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "delivered",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "escrow",
            "type": "pubkey"
          },
          {
            "name": "deliveredAt",
            "type": "i64"
          },
          {
            "name": "deliverableHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "keyHash",
            "docs": [
              "All zeros for an open delivery; otherwise the hash of the key that unlocks the work."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "escrow",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "client",
            "type": "pubkey"
          },
          {
            "name": "freelancer",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "id",
            "docs": [
              "Part of the PDA seeds; stored so payouts can re-derive the signer."
            ],
            "type": "u64"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "deadlineTs",
            "type": "i64"
          },
          {
            "name": "reviewWindowSecs",
            "type": "u64"
          },
          {
            "name": "deliveredAt",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "state",
            "type": {
              "defined": {
                "name": "escrowState"
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "deliverableHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "disputeWindowSecs",
            "docs": [
              "How long after `reject` the parties may settle before the funds burn."
            ],
            "type": "u64"
          },
          {
            "name": "frozenAt",
            "type": "i64"
          },
          {
            "name": "settleProposer",
            "docs": [
              "SETTLE_NONE / SETTLE_CLIENT / SETTLE_FREELANCER."
            ],
            "type": "u8"
          },
          {
            "name": "settleBps",
            "docs": [
              "Freelancer's share of the vault in basis points, as last proposed."
            ],
            "type": "u16"
          },
          {
            "name": "bondAmount",
            "docs": [
              "Size of each side's bond (`amount * bond_bps / 10000`, fixed at create). The",
              "freelancer posts it in accept_job and the client matches it in reject, so the",
              "vault holds amount + one bond after acceptance and amount + two bonds when Frozen."
            ],
            "type": "u64"
          },
          {
            "name": "keyHash",
            "docs": [
              "Sealed delivery: sha256 of the key that decrypts the work (all zeros = open delivery).",
              "`deliverable_hash` then commits to the ciphertext."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "revealedKey",
            "docs": [
              "The key, stored by claim_with_key in the transaction that pays the freelancer."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "approvedAt",
            "docs": [
              "When the client approved a sealed delivery (starts the key-reveal window)."
            ],
            "type": "i64"
          },
          {
            "name": "reserved",
            "docs": [
              "Unused space left from the original 64 reserved bytes. New fields must be carved",
              "out of it so the account size (and every existing account) stays the same."
            ],
            "type": {
              "array": [
                "u8",
                37
              ]
            }
          }
        ]
      }
    },
    {
      "name": "escrowCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "escrow",
            "type": "pubkey"
          },
          {
            "name": "client",
            "type": "pubkey"
          },
          {
            "name": "freelancer",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "id",
            "type": "u64"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "bondAmount",
            "type": "u64"
          },
          {
            "name": "deadlineTs",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "escrowState",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "funded"
          },
          {
            "name": "delivered"
          },
          {
            "name": "released"
          },
          {
            "name": "refunded"
          },
          {
            "name": "frozen"
          },
          {
            "name": "settled"
          },
          {
            "name": "burned"
          },
          {
            "name": "accepted"
          },
          {
            "name": "approved"
          }
        ]
      }
    },
    {
      "name": "jobAccepted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "escrow",
            "type": "pubkey"
          },
          {
            "name": "freelancer",
            "type": "pubkey"
          },
          {
            "name": "bondAmount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "keyRevealed",
      "docs": [
        "The key to a sealed delivery, published in the same transaction that pays for it."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "escrow",
            "type": "pubkey"
          },
          {
            "name": "key",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "refunded",
      "docs": [
        "Emitted by `refund_if_late`."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "escrow",
            "type": "pubkey"
          },
          {
            "name": "to",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "rejected",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "escrow",
            "type": "pubkey"
          },
          {
            "name": "clientBond",
            "type": "u64"
          },
          {
            "name": "frozenAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "released",
      "docs": [
        "Emitted by `release` and by `claim_if_silent`. `conceded` is true when the client",
        "released from `Frozen`, i.e. gave in during a dispute and forfeited their bond."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "escrow",
            "type": "pubkey"
          },
          {
            "name": "to",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "conceded",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "settled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "escrow",
            "type": "pubkey"
          },
          {
            "name": "burned",
            "type": "u64"
          },
          {
            "name": "toFreelancer",
            "type": "u64"
          },
          {
            "name": "toClient",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "settlementProposed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "escrow",
            "type": "pubkey"
          },
          {
            "name": "proposer",
            "docs": [
              "1 = client, 2 = freelancer."
            ],
            "type": "u8"
          },
          {
            "name": "freelancerBps",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "withdrawn",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "escrow",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "escrowSeed",
      "type": "bytes",
      "value": "[101, 115, 99, 114, 111, 119]"
    }
  ]
};

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
      "args": []
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
    }
  ],
  "types": [
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
            "name": "reserved",
            "docs": [
              "Spare space (carved out of the original 64 bytes) so the account size never changes."
            ],
            "type": {
              "array": [
                "u8",
                45
              ]
            }
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

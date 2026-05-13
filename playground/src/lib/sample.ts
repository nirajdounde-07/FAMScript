export const SAMPLE_SOURCE = `%% Sample family tree – edit me!
GGF_PAT["Ram Das | 104 | M | G+3 | deceased"]
GF_PAT["Ravi Das | 76 | M | G+2"]
GM_PAT["Kamla Das | 73 | F | G+2"]
F_SLF["Ramesh Kumar | 55 | M | G+1"]
M_SLF["Sunita Kumar | 52 | F | G+1"]
GROOM_SLF["Arjun Kumar | 28 | M | G0"]
BRIDE_SLF["Priya Sharma | 26 | F | G0"]

GGF_PAT --> GF_PAT
GF_PAT --- GM_PAT
GF_PAT --> F_SLF
F_SLF --- M_SLF
F_SLF --> GROOM_SLF
M_SLF --> GROOM_SLF
GROOM_SLF ==> BRIDE_SLF
`

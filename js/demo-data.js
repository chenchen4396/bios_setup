/**
 * 超聚变 (FusionServer) 多机型数据
 * 基于 DMTF DSP8010 AttributeRegistry v1.3.0 规范
 *
 * 每个机型拥有独立完整的属性集，体现代际/平台/用途差异
 */

const E  = (v)    => ({ valueName: v, valueDisplayName: v });
const EN = (v,d)  => ({ valueName: v, valueDisplayName: d });

/* ================================================================
 * 公共菜单树 (所有机型共享)
 * ================================================================ */
const COMMON_MENUS = [
    { MenuName:'Main',     DisplayName:'Main',           displayNameZh:'主要 / 系统信息',  DisplayOrder:1,  MenuPath:'./' },
    { MenuName:'Proc',     DisplayName:'Processor',      displayNameZh:'处理器配置',       DisplayOrder:2,  MenuPath:'./Processor' },
    { MenuName:'Mem',      DisplayName:'Memory',         displayNameZh:'内存配置',         DisplayOrder:3,  MenuPath:'./Memory' },
    { MenuName:'Storage',  DisplayName:'Storage',        displayNameZh:'存储配置',         DisplayOrder:4,  MenuPath:'./Storage' },
    { MenuName:'Network',  DisplayName:'Network',        displayNameZh:'网络配置',         DisplayOrder:5,  MenuPath:'./Network' },
    { MenuName:'Power',    DisplayName:'Power',          displayNameZh:'电源与性能',       DisplayOrder:6,  MenuPath:'./Power' },
    { MenuName:'Boot',     DisplayName:'Boot',           displayNameZh:'启动配置',         DisplayOrder:7,  MenuPath:'./Boot' },
    { MenuName:'Security', DisplayName:'Security',       displayNameZh:'安全配置',         DisplayOrder:8,  MenuPath:'./Security' },
    { MenuName:'Advanced', DisplayName:'Advanced',       displayNameZh:'高级配置',         DisplayOrder:9,  MenuPath:'./Advanced' },
    { MenuName:'SvrMgmt',  DisplayName:'Server Mgmt',    displayNameZh:'服务器管理',       DisplayOrder:10, MenuPath:'./ServerMgmt' },
    { MenuName:'Misc',     DisplayName:'Miscellaneous',  displayNameZh:'杂项配置',         DisplayOrder:11, MenuPath:'./Misc' },
];

function buildMenus(profile) {
    for (const m of COMMON_MENUS) profile.menuMap[m.MenuName] = createMenu(m);
}

function buildAttrs(profile, defs) {
    for (const d of defs) {
        const vlist = d.val || [];
        profile.attrMap[d.name] = createAttribute({
            AttributeName: d.name, Type: d.type, DefaultValue: d.def,
            DisplayName: d.disp, displayNameZh: d.dispZh || '',
            HelpText: d.help||'', helpTextZh: d.helpZh||'',
            MenuPath: d.menu, readOnly: d.ro || false,
            resetRequired: d.rb || false,
            Value: vlist.length ? vlist : undefined,
            LowerBound: d.lb??null, UpperBound: d.ub??null,
            ScalarIncrement: d.st??null,
            MinLength: d.mn??null, MaxLength: d.mx??null,
            AttributeScope: d.sc||'通用', Platforms: d.pl||[],
            supportsRedfish: d.sr!==undefined ? d.sr : true
        });
    }
}

function buildDeps(profile) {
    profile.dependencies = [
        createDependency({ DependencyFor:'SecureBoot',     MapFromAttribute:'BootMode',    MapFromProperty:'CurrentValue', MapFromCondition:'EQU', MapFromValue:'LegacyBios', MapToProperty:'Hidden',   MapToValue:true }),
        createDependency({ DependencyFor:'BootMode',       MapFromAttribute:'SecureBoot',  MapFromProperty:'CurrentValue', MapFromCondition:'EQU', MapFromValue:'Enabled',    MapToProperty:'ReadOnly', MapToValue:true }),
        createDependency({ DependencyFor:'SriovPCIe',      MapFromAttribute:'IntelVTd',    MapFromProperty:'CurrentValue', MapFromCondition:'EQU', MapFromValue:'Disabled',   MapToProperty:'GrayOut',  MapToValue:true }),
        createDependency({ DependencyFor:'PowerCapValue',  MapFromAttribute:'PowerCapEnable',MapFromProperty:'CurrentValue',MapFromCondition:'NEQ',MapFromValue:'Enabled',    MapToProperty:'GrayOut',  MapToValue:true }),
    ];
}

/* ================================================================
 * 机型 1: FusionServer 2288H V7 — 2U2P Sapphire Rapids 旗舰
 * ================================================================ */
const MODEL_2288HV7 = {
    productName: 'FusionServer 2288H V7',
    systemId: 'FUSION_2288HV7',
    firmwareVersion: 'iBMC V690 v3.45',
    attrs: [
        // ---- Main ----
        { name:'BiosVersion',        type:'String', def:'V690',       disp:'BIOS Version',         dispZh:'BIOS 版本',        help:'Current BIOS firmware version.', helpZh:'当前BIOS固件版本。', menu:'./', ro:true },
        { name:'BiosReleaseDate',    type:'String', def:'2026-03-15', disp:'BIOS Release Date',     dispZh:'BIOS 发布日期',    help:'BIOS firmware release date.',    helpZh:'BIOS固件发布日期。', menu:'./', ro:true },
        { name:'ProductName',        type:'String', def:'FusionServer 2288H V7', disp:'Product Name', dispZh:'产品名称',  help:'System product model.',          helpZh:'系统产品型号。', menu:'./', ro:true },
        { name:'BoardSerialNumber',  type:'String', def:'SNF12345678',disp:'Board Serial Number',   dispZh:'主板序列号',      help:'Unique board serial number.',    helpZh:'主板唯一序列号。', menu:'./', ro:true },
        { name:'CpuMicrocodeVersion',type:'String', def:'0x2B000171', disp:'CPU Microcode Version',  dispZh:'CPU 微码版本',    help:'Processor microcode patch.',    helpZh:'处理器微码补丁级别。', menu:'./', ro:true },

        // ---- Processor (Sapphire Rapids) ----
        { name:'IntelHyperThreading',     type:'Enumeration', def:'Enabled',  disp:'Hyper-Threading',      dispZh:'超线程技术',       help:'Each physical core runs two logical threads.', helpZh:'每核运行两个逻辑线程。', menu:'./Processor', val:[E('Enabled'),E('Disabled')], rb:true },
        { name:'ActiveCoresPerProcessor', type:'Integer',     def:0,          disp:'Active Cores/Proc',    dispZh:'每处理器启用核心数', help:'0=all cores. Max 56 on SPR.',              helpZh:'0=全部核心，最多56核。', menu:'./Processor', lb:0, ub:56, st:1, rb:true },
        { name:'IntelVT',                 type:'Enumeration', def:'Enabled',  disp:'Intel VT-x',           dispZh:'Intel 虚拟化技术',  help:'Hardware virtualization for hypervisors.',  helpZh:'硬件虚拟化加速。', menu:'./Processor', val:[E('Enabled'),E('Disabled')], rb:true },
        { name:'IntelVTd',                type:'Enumeration', def:'Enabled',  disp:'Intel VT-d',           dispZh:'Intel VT-d 定向I/O',help:'I/O device virtualization.',               helpZh:'I/O设备硬件虚拟化。', menu:'./Processor', val:[E('Enabled'),E('Disabled')], rb:true },
        { name:'ProcTurboMode',           type:'Enumeration', def:'Enabled',  disp:'Turbo Boost',          dispZh:'Turbo 加速模式',    help:'Automatic frequency boost under thermal headroom.', helpZh:'散热允许时自动提升频率。', menu:'./Processor', val:[E('Enabled'),E('Disabled')], rb:true },
        { name:'ProcCStates',             type:'Enumeration', def:'Enabled',  disp:'CPU C-States',          dispZh:'C状态节能',        help:'Idle power states. Disable reduces latency.', helpZh:'空闲节能状态，禁用降低延迟。', menu:'./Processor', val:[E('Enabled'),E('Disabled')] },
        { name:'ProcC1e',                 type:'Enumeration', def:'Enabled',  disp:'C1E Enhanced Halt',     dispZh:'C1E 增强暂停',      help:'Enhanced idle halt for power saving.',        helpZh:'增强空闲暂停节能。', menu:'./Processor', val:[E('Enabled'),E('Disabled')] },
        { name:'ProcConfigTDP',           type:'Enumeration', def:'Nominal',  disp:'Configurable TDP',      dispZh:'可配置TDP',         help:'Set processor Thermal Design Power level.',   helpZh:'设置处理器TDP级别。', menu:'./Processor', val:[E('Nominal'),E('Maximum'),EN('Reduced','Reduced Power')], sc:'字节', rb:true },
        { name:'SR_IOV_Global',           type:'Enumeration', def:'Disabled', disp:'SR-IOV Global',         dispZh:'SR-IOV 全局启用',   help:'Single Root I/O Virtualization.',             helpZh:'单根I/O虚拟化。', menu:'./Processor', val:[E('Enabled'),E('Disabled')], rb:true },

        // ---- Memory (DDR5) ----
        { name:'TotalMemSize',     type:'String',     def:'1024 GB',  disp:'Total Memory',        dispZh:'总内存容量',       help:'Total physical memory installed.', helpZh:'已安装总物理内存。', menu:'./Memory', ro:true },
        { name:'MemSpeed',         type:'Enumeration', def:'Auto',     disp:'Memory Speed',        dispZh:'内存速率',         help:'DDR5 bus speed. Auto=max supported.', helpZh:'DDR5速率，Auto=最大。', menu:'./Memory', val:[E('Auto'),E('5600'),E('5200'),E('4800'),E('4400'),E('4000')], rb:true },
        { name:'MemVoltage',       type:'Enumeration', def:'1.1V',    disp:'Memory Voltage',      dispZh:'内存电压',         help:'DDR5 DIMM operating voltage.',       helpZh:'DDR5 DIMM工作电压。', menu:'./Memory', val:[E('1.1V'),E('1.2V')] },
        { name:'MemPatrolScrub',   type:'Enumeration', def:'Enabled', disp:'Patrol Scrub',         dispZh:'内存巡检擦除',     help:'Periodically scan and correct memory errors.', helpZh:'定期扫描修正内存错误。', menu:'./Memory', val:[E('Enabled'),E('Disabled')] },
        { name:'MemNumaMode',      type:'Enumeration', def:'Enabled', disp:'NUMA Optimization',    dispZh:'NUMA 优化',        help:'NUMA-aware memory interleaving.',    helpZh:'多路NUMA感知交织。', menu:'./Memory', val:[E('Enabled'),E('Disabled')], rb:true },
        { name:'MemMirrorMode',    type:'Enumeration', def:'Disabled',disp:'Memory Mirror',        dispZh:'内存镜像',         help:'Mirror channels for fault tolerance (halves capacity).', helpZh:'通道镜像容错，容量减半。', menu:'./Memory', val:[E('Disabled'),E('Enabled'),E('Spare')], rb:true },
        { name:'MemRASMode',       type:'Enumeration', def:'MaxPerf', disp:'Memory RAS Mode',      dispZh:'内存RAS模式',      help:'Performance vs reliability trade-off.', helpZh:'性能与可靠性权衡。', menu:'./Memory', val:[EN('MaxPerf','Max Performance'),EN('MaxRel','Max Reliability'),EN('ADDDC','ADDDC')], sc:'字节', rb:true },
        { name:'DcpmmTotalCapacity',type:'String',     def:'512 GB',  disp:'Optane PMem Total',   dispZh:'傲腾持久内存总量', help:'Intel Optane Persistent Memory total.', helpZh:'傲腾持久内存总容量。', menu:'./Memory', ro:true, sc:'字节' },
        { name:'DcpmmAppDirectMode',type:'Enumeration', def:'Disabled',disp:'PMem App Direct',      dispZh:'PMem App Direct',   help:'Access Optane PMem as block device.',  helpZh:'傲腾持久内存块设备访问。', menu:'./Memory', val:[E('Enabled'),E('Disabled')], sc:'字节', rb:true },

        // ---- Storage ----
        { name:'SataController',   type:'Enumeration', def:'Enabled', disp:'SATA Controller',    dispZh:'SATA 控制器',        help:'Integrated SATA controller.',        helpZh:'板载SATA控制器。', menu:'./Storage', val:[E('Enabled'),E('Disabled')], rb:true },
        { name:'SataMode',         type:'Enumeration', def:'AHCI',    disp:'SATA Mode',          dispZh:'SATA 工作模式',       help:'AHCI for hot-plug; RAID for arrays.', helpZh:'AHCI热插拔；RAID阵列。', menu:'./Storage', val:[E('AHCI'),E('RAID')], rb:true },
        { name:'SataHotplugCap',   type:'Enumeration', def:'Enabled', disp:'SATA Hot Plug',      dispZh:'SATA 热插拔',         help:'Hot-plug support on all SATA ports.', helpZh:'所有SATA端口热插拔。', menu:'./Storage', val:[E('Enabled'),E('Disabled')] },
        { name:'SataPorts_0_3',    type:'Enumeration', def:'Enabled', disp:'SATA Ports 0-3',     dispZh:'SATA 端口 0-3',       help:'Enable ports 0 through 3.',           helpZh:'端口0-3启用。', menu:'./Storage', val:[E('Enabled'),E('Disabled')] },
        { name:'SataPorts_4_7',    type:'Enumeration', def:'Enabled', disp:'SATA Ports 4-7',     dispZh:'SATA 端口 4-7',       help:'Enable ports 4 through 7.',           helpZh:'端口4-7启用。', menu:'./Storage', val:[E('Enabled'),E('Disabled')] },
        { name:'NvmeRaidMode',     type:'Enumeration', def:'Disabled',disp:'NVMe RAID',           dispZh:'NVMe RAID 模式',      help:'NVMe RAID via VROC.',                 helpZh:'VROC NVMe RAID。', menu:'./Storage', val:[E('Enabled'),E('Disabled')], sc:'百度', rb:true },
        { name:'OnboardRaidCtrl',  type:'Enumeration', def:'Enabled', disp:'Onboard RAID Ctrl',  dispZh:'板载RAID控制器',      help:'Onboard RAID controller (LSI 9560).', helpZh:'板载RAID (LSI 9560)。', menu:'./Storage', val:[E('Enabled'),E('Disabled')], sc:'百度', rb:true },

        // ---- Network ----
        { name:'NicPXEStack',      type:'Enumeration', def:'Enabled',  disp:'UEFI PXE Stack',     dispZh:'UEFI PXE 协议栈',  help:'UEFI network stack for PXE boot.',  helpZh:'UEFI模式PXE网络启动。', menu:'./Network', val:[E('Enabled'),E('Disabled')] },
        { name:'NicHTTPBoot',      type:'Enumeration', def:'Disabled', disp:'HTTP Boot',          dispZh:'HTTP 启动支持',    help:'HTTP/HTTPS boot from network.',      helpZh:'HTTP/HTTPS网络启动。', menu:'./Network', val:[E('Enabled'),E('Disabled')] },
        { name:'NicIPv4PXE',       type:'Enumeration', def:'Enabled',  disp:'IPv4 PXE',           dispZh:'IPv4 PXE 支持',    help:'IPv4 PXE boot support.',             helpZh:'IPv4 PXE启动。', menu:'./Network', val:[E('Enabled'),E('Disabled')] },
        { name:'NicIPv6PXE',       type:'Enumeration', def:'Disabled', disp:'IPv6 PXE',           dispZh:'IPv6 PXE 支持',    help:'IPv6 PXE boot support.',             helpZh:'IPv6 PXE启动。', menu:'./Network', val:[E('Enabled'),E('Disabled')] },
        { name:'NicVlanSupport',   type:'Enumeration', def:'Disabled', disp:'VLAN Tagging',       dispZh:'VLAN 标记',        help:'VLAN tagging for UEFI network.',     helpZh:'UEFI网络VLAN标记。', menu:'./Network', val:[E('Enabled'),E('Disabled')] },
        { name:'NicBootMode',      type:'Enumeration', def:'UEFI',     disp:'NIC Boot Mode',      dispZh:'网卡启动协议',     help:'UEFI or Legacy PXE for NIC boot.',   helpZh:'网卡启动UEFI/Legacy PXE。', menu:'./Network', val:[E('UEFI'),E('Legacy PXE')], rb:true },
        { name:'IscsiBootSupport', type:'Enumeration', def:'Disabled', disp:'iSCSI Boot',         dispZh:'iSCSI 启动',       help:'iSCSI initiator for SAN boot.',       helpZh:'SAN启动iSCSI。', menu:'./Network', val:[E('Enabled'),E('Disabled')], rb:true },

        // ---- Boot ----
        { name:'BootMode',       type:'Enumeration', def:'Uefi',    disp:'Boot Mode',           dispZh:'启动模式',       help:'UEFI or Legacy BIOS boot mode.',     helpZh:'UEFI或Legacy BIOS启动。', menu:'./Boot', val:[EN('Uefi','UEFI'),EN('LegacyBios','Legacy BIOS')], rb:true },
        { name:'FastBoot',       type:'Enumeration', def:'Enabled', disp:'Fast Boot',            dispZh:'快速启动',       help:'Skip certain POST checks for speed.',helpZh:'跳过部分POST检查加速。', menu:'./Boot', val:[E('Enabled'),E('Disabled')] },
        { name:'QuietBoot',      type:'Enumeration', def:'Enabled', disp:'Quiet Boot',           dispZh:'安静启动',       help:'Show logo instead of POST messages.',helpZh:'显示Logo而非POST信息。', menu:'./Boot', val:[E('Enabled'),E('Disabled')] },
        { name:'BootTimeout',    type:'Integer',     def:5,        disp:'Boot Timeout (s)',     dispZh:'启动超时(秒)',   help:'Seconds before default boot entry.', helpZh:'默认启动项前等待秒数。', menu:'./Boot', lb:1, ub:65535, st:1 },
        { name:'BootRetryCount', type:'Integer',     def:3,        disp:'Boot Retry Count',     dispZh:'启动重试次数',   help:'Auto retry on boot failure.',        helpZh:'启动失败自动重试。', menu:'./Boot', lb:0, ub:10, st:1 },
        { name:'BootOrderType',  type:'Enumeration', def:'Custom', disp:'Boot Order Type',      dispZh:'启动顺序类型',   help:'Custom or default boot order.',      helpZh:'自定义或默认启动顺序。', menu:'./Boot', val:[E('Custom'),E('Default')] },
        { name:'PxeBootPriority',type:'Enumeration', def:'AfterStorage',disp:'PXE Boot Priority',dispZh:'PXE 启动优先级',help:'Relative priority of PXE vs storage.',helpZh:'PXE与存储启动相对优先级。', menu:'./Boot', val:[E('AfterStorage'),E('BeforeStorage'),E('Disabled')] },

        // ---- Security ----
        { name:'SecureBoot',         type:'Enumeration', def:'Disabled', disp:'Secure Boot State',   dispZh:'安全启动状态',    help:'Only signed bootloaders allowed.',      helpZh:'仅允许签名引导程序。', menu:'./Security', val:[E('Enabled'),E('Disabled')], ro:true, rb:true },
        { name:'SecureBootMode',     type:'Enumeration', def:'Standard', disp:'Secure Boot Mode',    dispZh:'安全启动模式',    help:'Standard=MS keys; Custom=user keys.',    helpZh:'标准=微软；自定义=用户。', menu:'./Security', val:[E('Standard'),E('Custom')], rb:true },
        { name:'TpmState',           type:'Enumeration', def:'Enabled',  disp:'TPM State',           dispZh:'TPM 状态',        help:'Trusted Platform Module (2.0).',         helpZh:'可信平台模块(2.0)。', menu:'./Security', val:[E('Enabled'),E('Disabled')], rb:true },
        { name:'TpmActivePcrBanks',  type:'Enumeration', def:'SHA256',   disp:'TPM PCR Banks',       dispZh:'TPM PCR存储区',   help:'Active PCR bank hash algorithm.',        helpZh:'活动PCR存储区算法。', menu:'./Security', val:[E('SHA1'),E('SHA256'),EN('SHA1_SHA256','SHA1+SHA256')], rb:true },
        { name:'TpmClear',           type:'Enumeration', def:'No',       disp:'Clear TPM',           dispZh:'清除TPM',         help:'Clear TPM ownership and keys.',          helpZh:'清除TPM所有权和密钥。', menu:'./Security', val:[E('No'),EN('YesReset','Yes, Next Reset')], rb:true },
        { name:'Tpm2FirmwareUpdate', type:'Enumeration', def:'Enabled',  disp:'TPM FW Update',       dispZh:'TPM 固件更新',    help:'Allow TPM 2.0 firmware update.',          helpZh:'允许TPM固件更新。', menu:'./Security', val:[E('Enabled'),E('Disabled')] },
        { name:'AdminPassword',      type:'Password',    def:null,       disp:'Admin Password',      dispZh:'管理员密码',      help:'BIOS admin password (8-32 chars).',      helpZh:'BIOS管理员密码(8-32字符)。', menu:'./Security', mn:8, mx:32 },
        { name:'UserPassword',       type:'Password',    def:null,       disp:'User Password',       dispZh:'用户密码',        help:'BIOS user password (8-32 chars).',       helpZh:'BIOS用户密码(8-32字符)。', menu:'./Security', mn:8, mx:32 },
        { name:'ChassisIntrusion',   type:'Enumeration', def:'Disabled', disp:'Chassis Intrusion',   dispZh:'机箱入侵检测',    help:'Detect and log chassis cover open.',      helpZh:'检测机箱盖开启并记录。', menu:'./Security', val:[E('Enabled'),E('Disabled')] },

        // ---- Power ----
        { name:'PowerPolicy',          type:'Enumeration', def:'Efficient',disp:'Power Policy',       dispZh:'电源策略',        help:'Overall system power management.',        helpZh:'整体电源管理策略。', menu:'./Power', val:[EN('Perf','Max Performance'),EN('Efficient','Efficient'),EN('Save','Power Saving')], rb:true },
        { name:'AcPowerRestorePolicy', type:'Enumeration', def:'LastState',disp:'AC Power Restore',   dispZh:'交流电恢复策略',  help:'Behavior after AC power loss.',             helpZh:'交流断电恢复行为。', menu:'./Power', val:[EN('Off','Always Off'),EN('On','Always On'),EN('LastState','Last State')] },
        { name:'PowerOnByLAN',         type:'Enumeration', def:'Enabled', disp:'Wake-on-LAN',        dispZh:'网络唤醒',        help:'Power on via magic packet.',               helpZh:'网络Magic Packet唤醒。', menu:'./Power', val:[E('Enabled'),E('Disabled')] },
        { name:'PowerOnDelay',         type:'Integer',     def:0,        disp:'Power-On Delay (s)',  dispZh:'开机延迟(秒)',    help:'Delay after AC restore before power on.',  helpZh:'交流恢复后开机延迟。', menu:'./Power', lb:0, ub:600, st:5 },
        { name:'FanControlMode',       type:'Enumeration', def:'Auto',   disp:'Fan Control Mode',    dispZh:'风扇控制模式',    help:'Auto=BIOS; Manual=user profile.',          helpZh:'Auto=BIOS；Manual=用户。', menu:'./Power', val:[E('Auto'),E('Manual')] },
        { name:'FanSpeedLowLimit',     type:'Integer',     def:20,       disp:'Fan Speed Min (%)',   dispZh:'风扇最低转速(%)', help:'Minimum fan speed percentage.',            helpZh:'风扇最低转速百分比。', menu:'./Power', lb:5, ub:100, st:5 },
        { name:'PowerCapEnable',       type:'Enumeration', def:'Disabled',disp:'Power Capping',      dispZh:'功率封顶',        help:'Limit system power consumption.',          helpZh:'限制系统功耗。', menu:'./Power', val:[E('Enabled'),E('Disabled')], sc:'百度' },
        { name:'PowerCapValue',        type:'Integer',     def:800,      disp:'Power Cap Value (W)', dispZh:'功率封顶值(瓦)',  help:'Max power when capping is active.',        helpZh:'功率封顶最大功耗。', menu:'./Power', lb:100, ub:3000, st:10, sc:'百度' },
        { name:'RtcWakeup',            type:'Enumeration', def:'Disabled',disp:'RTC Wakeup Timer',   dispZh:'RTC 定时开机',    help:'Auto power-on at scheduled time.',         helpZh:'定时自动开机。', menu:'./Power', val:[E('Enabled'),E('Disabled')] },

        // ---- Advanced (CPU prefetchers, PCIe, USB, Serial) ----
        { name:'HardwarePrefetcher',    type:'Enumeration', def:'Enabled',  disp:'Hardware Prefetcher',  dispZh:'硬件预取器',        help:'L2 cache hardware prefetcher.',           helpZh:'L2缓存硬件预取。', menu:'./Advanced', val:[E('Enabled'),E('Disabled')], rb:true },
        { name:'AdjacentCachePrefetch', type:'Enumeration', def:'Enabled',  disp:'Adjacent Cache Prefetch',dispZh:'邻接缓存预取',   help:'128-byte adjacent cache line prefetch.',   helpZh:'128字节邻接缓存行预取。', menu:'./Advanced', val:[E('Enabled'),E('Disabled')], rb:true },
        { name:'DCUStreamPrefetcher',   type:'Enumeration', def:'Enabled',  disp:'DCU Stream Prefetch',  dispZh:'DCU 流预取器',      help:'L1 data cache stream prefetcher.',        helpZh:'L1数据缓存流预取。', menu:'./Advanced', val:[E('Enabled'),E('Disabled')], rb:true },
        { name:'DCUIPPrefetcher',       type:'Enumeration', def:'Enabled',  disp:'DCU IP Prefetch',      dispZh:'DCU IP 预取器',      help:'L1 DCU IP-based prefetcher.',             helpZh:'L1指令指针预取。', menu:'./Advanced', val:[E('Enabled'),E('Disabled')], rb:true },
        { name:'LLCPrefetch',           type:'Enumeration', def:'Enabled',  disp:'LLC Prefetch',         dispZh:'LLC 预取',           help:'Last Level Cache prefetch.',              helpZh:'最后一级缓存预取。', menu:'./Advanced', val:[E('Enabled'),E('Disabled')], rb:true },
        { name:'XptPrefetch',           type:'Enumeration', def:'Enabled',  disp:'XPT Remote Prefetch',  dispZh:'XPT 远程预取',       help:'Multi-socket remote cache prefetch.',     helpZh:'多路远程缓存预取。', menu:'./Advanced', val:[E('Enabled'),E('Disabled')], rb:true },
        { name:'AESNI',                 type:'Enumeration', def:'Enabled',  disp:'Intel AES-NI',         dispZh:'AES-NI 指令集',      help:'Hardware-accelerated AES encryption.',    helpZh:'硬件加速AES加密。', menu:'./Advanced', val:[E('Enabled'),E('Disabled')], rb:true },
        { name:'IntelSGX',              type:'Enumeration', def:'Disabled', disp:'Intel SGX',            dispZh:'SGX 软件保护扩展',   help:'Hardware-enforced enclave security.',     helpZh:'硬件强制内存加密可信环境。', menu:'./Advanced', val:[E('Enabled'),E('Disabled')], rb:true },
        { name:'IntelTME',              type:'Enumeration', def:'Disabled', disp:'Intel TME',            dispZh:'全内存加密(TME)',    help:'Hardware-based full memory encryption.',  helpZh:'基于硬件全内存加密。', menu:'./Advanced', val:[E('Enabled'),E('Disabled')], rb:true },
        { name:'IntelSMX',              type:'Enumeration', def:'Enabled',  disp:'Intel SMX',            dispZh:'安全模式扩展(SMX)',  help:'Safer Mode Extensions for Intel TXT.',    helpZh:'Intel TXT安全模式。', menu:'./Advanced', val:[E('Enabled'),E('Disabled')], rb:true },
        // PCIe
        { name:'Above4GDecoding',   type:'Enumeration', def:'Enabled',  disp:'Above 4G Decoding',  dispZh:'4G以上地址解码',    help:'64-bit PCIe BAR address space.',          helpZh:'64位PCIe BAR地址空间。', menu:'./Advanced', val:[E('Enabled'),E('Disabled')], rb:true },
        { name:'ResizableBAR',      type:'Enumeration', def:'Enabled',  disp:'Re-Size BAR',        dispZh:'可调整BAR',          help:'PCIe resizable BAR for GPUs.',            helpZh:'GPU可调整BAR。', menu:'./Advanced', val:[E('Enabled'),E('Disabled')], rb:true },
        { name:'PcieAspmSupport',   type:'Enumeration', def:'Auto',     disp:'PCIe ASPM',          dispZh:'PCIe ASPM 节能',     help:'Active State Power Management.',          helpZh:'主动状态电源管理。', menu:'./Advanced', val:[E('Auto'),E('Enabled'),E('Disabled')] },
        { name:'PcieMaxLinkSpeed',  type:'Enumeration', def:'Auto',     disp:'PCIe Max Link Speed', dispZh:'PCIe 最大链路速率',  help:'Limit max PCIe speed (Gen5 capable).',    helpZh:'限制PCIe最大速率(支持Gen5)。', menu:'./Advanced', val:[E('Auto'),E('Gen1'),E('Gen2'),E('Gen3'),E('Gen4'),E('Gen5')], rb:true },
        { name:'SriovPCIe',         type:'Enumeration', def:'Disabled', disp:'SR-IOV (PCIe)',       dispZh:'PCIe SR-IOV',        help:'Global PCIe SR-IOV enable. Needs VT-d.',  helpZh:'全局PCIe SR-IOV。需VT-d启用。', menu:'./Advanced', val:[E('Enabled'),E('Disabled')], rb:true },
        { name:'Pcie10BitTag',      type:'Enumeration', def:'Enabled',  disp:'PCIe 10-bit Tag',    dispZh:'PCIe 10位标签',      help:'Expanded tag for more outstanding reqs.', helpZh:'扩展标签增加未完成请求。', menu:'./Advanced', val:[E('Enabled'),E('Disabled')], rb:true },
        { name:'MmioAbove4GbSize',  type:'Enumeration', def:'Auto',     disp:'MMIO Above 4GB',     dispZh:'MMIO 4GB以上空间',   help:'Memory-mapped I/O space above 4GB.',      helpZh:'4GB以上MMIO空间。', menu:'./Advanced', val:[E('Auto'),E('64G'),E('128G'),E('256G'),E('512G')], rb:true },
        // USB
        { name:'UsbPortsAll',        type:'Enumeration', def:'Enabled', disp:'All USB Ports',        dispZh:'所有USB端口',        help:'Global USB ports switch.',               helpZh:'全局USB端口开关。', menu:'./Advanced', val:[E('Enabled'),E('Disabled')], rb:true },
        { name:'UsbFrontPorts',      type:'Enumeration', def:'Enabled', disp:'Front USB Ports',      dispZh:'前置USB端口',        help:'Front panel USB 3.0 ports.',             helpZh:'前面板USB 3.0。', menu:'./Advanced', val:[E('Enabled'),E('Disabled')] },
        { name:'UsbRearPorts',       type:'Enumeration', def:'Enabled', disp:'Rear USB Ports',       dispZh:'后置USB端口',        help:'Rear panel USB 3.0 ports.',              helpZh:'后面板USB 3.0。', menu:'./Advanced', val:[E('Enabled'),E('Disabled')] },
        { name:'UsbInternalPorts',   type:'Enumeration', def:'Enabled', disp:'Internal USB Ports',   dispZh:'内部USB端口',        help:'Internal USB for dongles/keys.',         helpZh:'内部USB加密狗。', menu:'./Advanced', val:[E('Enabled'),E('Disabled')] },
        { name:'UsbBootSupport',     type:'Enumeration', def:'Enabled', disp:'USB Boot Support',     dispZh:'USB 启动支持',       help:'Allow booting from USB devices.',        helpZh:'允许USB设备启动。', menu:'./Advanced', val:[E('Enabled'),E('Disabled')] },
        { name:'UsbMassStorageDriver',type:'Enumeration',def:'Enabled',  disp:'USB Mass Storage',    dispZh:'USB 大容量存储驱动', help:'UEFI USB mass storage driver.',          helpZh:'UEFI USB大容量存储驱动。', menu:'./Advanced', val:[E('Enabled'),E('Disabled')] },
        { name:'VGA_Primary',        type:'Enumeration', def:'Auto',    disp:'Primary Video',        dispZh:'主显示适配器',      help:'Primary display adapter selection.',      helpZh:'主显示适配器选择。', menu:'./Advanced', val:[E('Auto'),EN('Onboard','Onboard VGA'),EN('PCIe','PCIe VGA')], rb:true },
        // Serial
        { name:'SerialAEnabled',    type:'Enumeration', def:'Enabled',  disp:'Serial Port A (COM1)', dispZh:'串口A (COM1)',        help:'Serial port A enable/disable.',           helpZh:'串口A启用/禁用。', menu:'./Advanced', val:[E('Enabled'),E('Disabled')], rb:true },
        { name:'SerialBEnabled',    type:'Enumeration', def:'Disabled', disp:'Serial Port B (COM2)', dispZh:'串口B (COM2)',        help:'Serial port B enable/disable.',           helpZh:'串口B启用/禁用。', menu:'./Advanced', val:[E('Enabled'),E('Disabled')], rb:true },
        { name:'SerialBaudRate',    type:'Enumeration', def:'115200',   disp:'Serial Baud Rate',     dispZh:'串口波特率',         help:'Serial console baud rate.',               helpZh:'串口控制台波特率。', menu:'./Advanced', val:[E('9600'),E('19200'),E('38400'),E('57600'),E('115200')] },
        { name:'SerialFlowControl', type:'Enumeration', def:'None',     disp:'Serial Flow Control',  dispZh:'串口流控制',         help:'Serial flow control method.',             helpZh:'串口流控制方式。', menu:'./Advanced', val:[E('None'),E('Hardware'),E('Software')] },
        { name:'ConsoleRedirect',   type:'Enumeration', def:'Enabled',  disp:'Console Redirection',  dispZh:'控制台重定向',       help:'Serial console to remote terminal.',      helpZh:'串行控制台远程终端。', menu:'./Advanced', val:[E('Enabled'),E('Disabled')] },
        // Performance
        { name:'PerfProfile',           type:'Enumeration', def:'Efficient', disp:'Performance Profile',dispZh:'性能配置档',          help:'Pre-defined performance tuning.',         helpZh:'预定义性能调优。', menu:'./Advanced', val:[EN('MaxPerf','Max Performance'),EN('Efficient','Efficient'),EN('Latency','Latency Opt'),EN('Throughput','Throughput Opt')], rb:true },
        { name:'EnergyEfficientTurbo',  type:'Enumeration', def:'Enabled',  disp:'Energy Efficient Turbo',dispZh:'节能Turbo',        help:'Optimized Turbo for performance/watt.',   helpZh:'优化Turbo最佳每瓦性能。', menu:'./Advanced', val:[E('Enabled'),E('Disabled')] },
        { name:'WorkloadConfig',        type:'Enumeration', def:'General',  disp:'Workload Config',     dispZh:'工作负载配置',        help:'System tuning for workload type.',         helpZh:'工作负载类型系统调优。', menu:'./Advanced', val:[E('General'),EN('IOIntensive','I/O Intensive'),EN('ComputeIntensive','Compute Intensive')], sc:'百度', rb:true },
        { name:'SubNumaClustering',     type:'Enumeration', def:'Disabled', disp:'Sub-NUMA Clustering', dispZh:'子NUMA集群(SNC)',     help:'Split LLC into independent NUMA domains.', helpZh:'拆分LLC为独立NUMA域。', menu:'./Advanced', val:[E('Enabled'),E('Disabled')], rb:true },
        { name:'DdrSpeedOptimization',  type:'Enumeration', def:'Balanced', disp:'DDR Speed Optimize',  dispZh:'DDR 速率优化',        help:'DDR5 timing optimization.',                helpZh:'DDR5时序优化。', menu:'./Advanced', val:[EN('Balanced','Balanced'),EN('Performance','Performance'),EN('Stability','Stability')], rb:true },

        // ---- Server Mgmt ----
        { name:'BmcWatchdog',          type:'Enumeration', def:'Enabled',  disp:'BMC Watchdog',        dispZh:'BMC 看门狗',         help:'Reset system if OS unresponsive.',       helpZh:'OS无响应时自动复位。', menu:'./ServerMgmt', val:[E('Enabled'),E('Disabled')] },
        { name:'BmcWatchdogTimeout',   type:'Integer',     def:300,        disp:'Watchdog Timeout (s)',dispZh:'看门狗超时(秒)',    help:'Seconds before watchdog triggers reset.',helpZh:'看门狗超时秒数。', menu:'./ServerMgmt', lb:30, ub:1800, st:30 },
        { name:'OsWatchdogTimer',      type:'Enumeration', def:'Enabled',  disp:'OS Watchdog',         dispZh:'OS 看门狗',          help:'OS-level boot supervision watchdog.',    helpZh:'OS级启动监控看门狗。', menu:'./ServerMgmt', val:[E('Enabled'),E('Disabled')] },
        { name:'SolEnabled',           type:'Enumeration', def:'Enabled',  disp:'Serial Over LAN',     dispZh:'SOL 局域网串口',     help:'Remote console via BMC SOL.',            helpZh:'BMC SOL远程控制台。', menu:'./ServerMgmt', val:[E('Enabled'),E('Disabled')] },
        { name:'BmcLanMode',           type:'Enumeration', def:'Dedicated',disp:'BMC LAN Mode',        dispZh:'BMC 网络模式',       help:'Dedicated or shared management port.',   helpZh:'专用或共享管理口。', menu:'./ServerMgmt', val:[E('Dedicated'),EN('SharedLOM','Shared LOM')], sc:'百度' },
        { name:'ErpLot6PowerMode',     type:'Enumeration', def:'Disabled', disp:'ERP Lot 6',           dispZh:'ERP Lot 6 节能',     help:'EU ERP Lot 6 deep power saving mode.',   helpZh:'欧盟ERP Lot 6深度节能。', menu:'./ServerMgmt', val:[E('Enabled'),E('Disabled')] },
        { name:'SysMaintenanceSwitch', type:'Enumeration', def:'Disabled', disp:'Maintenance Switch',  dispZh:'维护模式',           help:'Bypass certain boot security checks.',   helpZh:'绕过启动安全检查。', menu:'./ServerMgmt', val:[E('Enabled'),E('Disabled')], sc:'百度' },
        { name:'BmcIPv4Address',       type:'String',      def:'192.168.1.100',disp:'BMC IPv4',        dispZh:'BMC IPv4',           help:'BMC management IP address.',             helpZh:'BMC管理IP地址。', menu:'./ServerMgmt', ro:true },
        { name:'BmcMacAddress',        type:'String',      def:'00:1B:2C:3D:4E:5F',disp:'BMC MAC',     dispZh:'BMC MAC',            help:'BMC management MAC address.',            helpZh:'BMC管理MAC地址。', menu:'./ServerMgmt', ro:true },

        // ---- Misc ----
        { name:'NumLock',               type:'Enumeration', def:'On',       disp:'NumLock',              dispZh:'数字锁定状态',      help:'Initial NumLock at boot.',               helpZh:'启动时NumLock状态。', menu:'./Misc', val:[E('On'),E('Off')] },
        { name:'CpuErrLog',             type:'Enumeration', def:'Enabled',  disp:'CPU Error Logging',    dispZh:'CPU 错误日志',       help:'Log processor machine check errors.',     helpZh:'记录处理器机器检查错误。', menu:'./Misc', val:[E('Enabled'),E('Disabled')] },
        { name:'MemErrLog',             type:'Enumeration', def:'Enabled',  disp:'Memory Error Logging', dispZh:'内存错误日志',      help:'Log memory ECC errors.',                  helpZh:'记录内存ECC错误。', menu:'./Misc', val:[E('Enabled'),E('Disabled')] },
        { name:'PcieErrLog',            type:'Enumeration', def:'Enabled',  disp:'PCIe Error Logging',   dispZh:'PCIe 错误日志',      help:'Log PCIe correctable/uncorrectable errors.', helpZh:'记录PCIe可纠正/不可纠正错误。', menu:'./Misc', val:[E('Enabled'),E('Disabled')] },
        { name:'WheaSupport',           type:'Enumeration', def:'Enabled',  disp:'WHEA Support',         dispZh:'WHEA 支持',          help:'Windows Hardware Error Architecture.',    helpZh:'Windows硬件错误架构。', menu:'./Misc', val:[E('Enabled'),E('Disabled')] },
        { name:'ConsoleRedirectType',   type:'Enumeration', def:'VT-UTF8',  disp:'Console Type',         dispZh:'控制台终端类型',    help:'Terminal emulation for console redirect.',helpZh:'控制台重定向终端仿真。', menu:'./Misc', val:[EN('VT100','VT-100'),EN('VT100+','VT-100+'),EN('VT-UTF8','VT-UTF8'),EN('ANSI','ANSI')] },
        { name:'PxeIpVersion',          type:'Enumeration', def:'IPv4',     disp:'PXE IP Version',       dispZh:'PXE IP 版本',        help:'Default IP version for PXE boot.',        helpZh:'PXE启动默认IP版本。', menu:'./Misc', val:[E('IPv4'),E('IPv6')] },
    ]
};

/* ================================================================
 * 机型 2: FusionServer 1288H V7 — 1U2P 高密度
 * ================================================================ */
const MODEL_1288HV7 = {
    productName: 'FusionServer 1288H V7',
    systemId: 'FUSION_1288HV7',
    firmwareVersion: 'iBMC V688 v3.42',
    attrs: [
        { name:'BiosVersion',        type:'String', def:'V688',       disp:'BIOS Version',         dispZh:'BIOS 版本',        menu:'./', ro:true },
        { name:'BiosReleaseDate',    type:'String', def:'2026-01-20', disp:'BIOS Release Date',     dispZh:'BIOS 发布日期',    menu:'./', ro:true },
        { name:'ProductName',        type:'String', def:'FusionServer 1288H V7', disp:'Product Name',dispZh:'产品名称',   menu:'./', ro:true },
        { name:'CpuMicrocodeVersion',type:'String', def:'0x2B000160', disp:'CPU Microcode',          dispZh:'CPU 微码',         menu:'./', ro:true },

        // Processor (1U density — limited TDP options)
        { name:'IntelHyperThreading',     type:'Enumeration', def:'Enabled',  disp:'Hyper-Threading',      dispZh:'超线程',          val:[E('Enabled'),E('Disabled')], menu:'./Processor', rb:true },
        { name:'ActiveCoresPerProcessor', type:'Integer',     def:0,          disp:'Active Cores',         dispZh:'启用核心数',      lb:0, ub:48, st:1, menu:'./Processor', rb:true },
        { name:'IntelVT',                 type:'Enumeration', def:'Enabled',  disp:'Intel VT-x',           dispZh:'VT-x 虚拟化',     val:[E('Enabled'),E('Disabled')], menu:'./Processor', rb:true },
        { name:'IntelVTd',                type:'Enumeration', def:'Enabled',  disp:'Intel VT-d',           dispZh:'VT-d 定向I/O',    val:[E('Enabled'),E('Disabled')], menu:'./Processor', rb:true },
        { name:'ProcTurboMode',           type:'Enumeration', def:'Enabled',  disp:'Turbo Boost',          dispZh:'Turbo 加速',      val:[E('Enabled'),E('Disabled')], menu:'./Processor', rb:true },
        { name:'ProcCStates',             type:'Enumeration', def:'Enabled',  disp:'C-States',             dispZh:'C状态节能',        val:[E('Enabled'),E('Disabled')], menu:'./Processor' },
        { name:'ProcConfigTDP',           type:'Enumeration', def:'Nominal',  disp:'Configurable TDP',     dispZh:'可配置TDP',       val:[E('Nominal'),E('Maximum')], menu:'./Processor', sc:'阿里', rb:true },
        // 1U thermal constraints — lower upper bounds
        { name:'ProcThermalThrottle',     type:'Enumeration', def:'Enabled',  disp:'Thermal Throttling',   dispZh:'温度节流',         help:'1U density thermal protection.', helpZh:'1U高密度散热保护。', val:[E('Enabled'),E('Disabled')], menu:'./Processor' },

        // Memory (DDR5, limited capacity in 1U)
        { name:'TotalMemSize',     type:'String',     def:'512 GB',  disp:'Total Memory',     dispZh:'总内存',     menu:'./Memory', ro:true },
        { name:'MemSpeed',         type:'Enumeration', def:'Auto',     disp:'Memory Speed',     dispZh:'内存速率',   val:[E('Auto'),E('5600'),E('5200'),E('4800'),E('4400')], menu:'./Memory', rb:true },
        { name:'MemVoltage',       type:'Enumeration', def:'1.1V',    disp:'Memory Voltage',   dispZh:'内存电压',   val:[E('1.1V'),E('1.2V')], menu:'./Memory' },
        { name:'MemPatrolScrub',   type:'Enumeration', def:'Enabled', disp:'Patrol Scrub',      dispZh:'内存巡检',   val:[E('Enabled'),E('Disabled')], menu:'./Memory' },
        { name:'MemNumaMode',      type:'Enumeration', def:'Enabled', disp:'NUMA Optimize',     dispZh:'NUMA 优化',  val:[E('Enabled'),E('Disabled')], menu:'./Memory', rb:true },
        { name:'MemMirrorMode',    type:'Enumeration', def:'Disabled',disp:'Memory Mirror',     dispZh:'内存镜像',   val:[E('Disabled'),E('Enabled'),E('Spare')], menu:'./Memory', rb:true },
        { name:'MemRASMode',       type:'Enumeration', def:'MaxPerf', disp:'Memory RAS',        dispZh:'内存RAS',    val:[EN('MaxPerf','Max Performance'),EN('MaxRel','Max Reliability')], menu:'./Memory', rb:true },
        // DIMM sparing for 1U reliability
        { name:'MemRankSparing',   type:'Enumeration', def:'Disabled',disp:'Rank Sparing',      dispZh:'Rank 备用',   help:'Reserve memory ranks as hot-spares.', helpZh:'预留内存rank作为热备用。', val:[E('Enabled'),E('Disabled')], menu:'./Memory', rb:true },

        // Storage (fewer ports in 1U)
        { name:'SataController',   type:'Enumeration', def:'Enabled', disp:'SATA Controller',    dispZh:'SATA 控制器', val:[E('Enabled'),E('Disabled')], menu:'./Storage', rb:true },
        { name:'SataMode',         type:'Enumeration', def:'AHCI',    disp:'SATA Mode',          dispZh:'SATA 模式',   val:[E('AHCI'),E('RAID')], menu:'./Storage', rb:true },
        { name:'NvmeRaidMode',     type:'Enumeration', def:'Disabled',disp:'NVMe RAID',          dispZh:'NVMe RAID',    val:[E('Enabled'),E('Disabled')], menu:'./Storage', rb:true },
        { name:'SataHotplugCap',   type:'Enumeration', def:'Enabled', disp:'SATA Hot Plug',      dispZh:'SATA 热插拔', val:[E('Enabled'),E('Disabled')], menu:'./Storage' },

        // Network
        { name:'NicPXEStack',      type:'Enumeration', def:'Enabled',  disp:'UEFI PXE Stack',     dispZh:'PXE 协议栈',   val:[E('Enabled'),E('Disabled')], menu:'./Network' },
        { name:'NicHTTPBoot',      type:'Enumeration', def:'Disabled', disp:'HTTP Boot',          dispZh:'HTTP 启动',     val:[E('Enabled'),E('Disabled')], menu:'./Network' },
        { name:'NicIPv4PXE',       type:'Enumeration', def:'Enabled',  disp:'IPv4 PXE',           dispZh:'IPv4 PXE',      val:[E('Enabled'),E('Disabled')], menu:'./Network' },
        { name:'NicIPv6PXE',       type:'Enumeration', def:'Disabled', disp:'IPv6 PXE',           dispZh:'IPv6 PXE',      val:[E('Enabled'),E('Disabled')], menu:'./Network' },
        { name:'NicBootMode',      type:'Enumeration', def:'UEFI',     disp:'NIC Boot Mode',      dispZh:'网卡启动模式',  val:[E('UEFI'),E('Legacy PXE')], menu:'./Network', rb:true },

        // Boot
        { name:'BootMode',       type:'Enumeration', def:'Uefi',    disp:'Boot Mode',           dispZh:'启动模式',       val:[EN('Uefi','UEFI'),EN('LegacyBios','Legacy BIOS')], menu:'./Boot', rb:true },
        { name:'FastBoot',       type:'Enumeration', def:'Enabled', disp:'Fast Boot',            dispZh:'快速启动',       val:[E('Enabled'),E('Disabled')], menu:'./Boot' },
        { name:'QuietBoot',      type:'Enumeration', def:'Enabled', disp:'Quiet Boot',           dispZh:'安静启动',       val:[E('Enabled'),E('Disabled')], menu:'./Boot' },
        { name:'BootTimeout',    type:'Integer',     def:3,        disp:'Boot Timeout (s)',     dispZh:'启动超时(秒)',   lb:1, ub:65535, st:1, menu:'./Boot' },
        { name:'BootRetryCount', type:'Integer',     def:2,        disp:'Boot Retry Count',     dispZh:'启动重试次数',   lb:0, ub:10, st:1, menu:'./Boot' },

        // Security
        { name:'SecureBoot',         type:'Enumeration', def:'Disabled', disp:'Secure Boot',       dispZh:'安全启动',       val:[E('Enabled'),E('Disabled')], ro:true, menu:'./Security', rb:true },
        { name:'SecureBootMode',     type:'Enumeration', def:'Standard', disp:'Secure Boot Mode',  dispZh:'安全启动模式',   val:[E('Standard'),E('Custom')], menu:'./Security', rb:true },
        { name:'TpmState',           type:'Enumeration', def:'Enabled',  disp:'TPM State',         dispZh:'TPM 状态',       val:[E('Enabled'),E('Disabled')], menu:'./Security', rb:true },
        { name:'TpmActivePcrBanks',  type:'Enumeration', def:'SHA256',   disp:'TPM PCR Banks',     dispZh:'TPM PCR',        val:[E('SHA1'),E('SHA256')], menu:'./Security', rb:true },
        { name:'AdminPassword',      type:'Password',    def:null,       disp:'Admin Password',    dispZh:'管理员密码',     mn:8, mx:32, menu:'./Security' },
        { name:'UserPassword',       type:'Password',    def:null,       disp:'User Password',     dispZh:'用户密码',       mn:8, mx:32, menu:'./Security' },

        // Power (1U — lower fan limits, aggressive power management)
        { name:'PowerPolicy',          type:'Enumeration', def:'Efficient', disp:'Power Policy',     dispZh:'电源策略',       val:[EN('Perf','Max Performance'),EN('Efficient','Efficient'),EN('Save','Power Saving')], menu:'./Power', rb:true },
        { name:'AcPowerRestorePolicy', type:'Enumeration', def:'LastState',disp:'AC Restore',        dispZh:'交流电恢复',     val:[EN('Off','Always Off'),EN('On','Always On'),EN('LastState','Last State')], menu:'./Power' },
        { name:'PowerOnByLAN',         type:'Enumeration', def:'Enabled',  disp:'Wake-on-LAN',     dispZh:'网络唤醒',        val:[E('Enabled'),E('Disabled')], menu:'./Power' },
        { name:'FanControlMode',       type:'Enumeration', def:'Auto',     disp:'Fan Control',     dispZh:'风扇控制',        val:[E('Auto'),E('Manual')], menu:'./Power' },
        { name:'FanSpeedLowLimit',     type:'Integer',     def:30,         disp:'Fan Min (%)',     dispZh:'风扇最低(%)',     help:'1U higher min fan speed for cooling.', lb:10, ub:100, st:5, menu:'./Power' },
        { name:'PowerCapEnable',       type:'Enumeration', def:'Disabled', disp:'Power Capping',    dispZh:'功率封顶',        val:[E('Enabled'),E('Disabled')], sc:'阿里', menu:'./Power' },
        { name:'PowerCapValue',        type:'Integer',     def:500,        disp:'Power Cap (W)',    dispZh:'功率封顶(瓦)',    lb:100, ub:1500, st:10, sc:'阿里', menu:'./Power' },
        // 1U-specific: tighter power budget
        { name:'DynPowerCapping',      type:'Enumeration', def:'Enabled',  disp:'Dynamic Power Cap', dispZh:'动态功率封顶',    help:'Auto-adjust power cap based on workload.', helpZh:'根据负载自动调整功耗上限。', val:[E('Enabled'),E('Disabled')], menu:'./Power' },

        // Advanced
        { name:'HardwarePrefetcher',   type:'Enumeration', def:'Enabled',  disp:'Hardware Prefetcher',dispZh:'硬件预取器',   val:[E('Enabled'),E('Disabled')], menu:'./Advanced', rb:true },
        { name:'AdjacentCachePrefetch',type:'Enumeration', def:'Enabled',  disp:'Adjacent Prefetch',  dispZh:'邻接预取',     val:[E('Enabled'),E('Disabled')], menu:'./Advanced', rb:true },
        { name:'DCUStreamPrefetcher',  type:'Enumeration', def:'Enabled',  disp:'DCU Stream Pre',    dispZh:'DCU 流预取',   val:[E('Enabled'),E('Disabled')], menu:'./Advanced', rb:true },
        { name:'AESNI',                type:'Enumeration', def:'Enabled',  disp:'Intel AES-NI',       dispZh:'AES-NI',        val:[E('Enabled'),E('Disabled')], menu:'./Advanced', rb:true },
        { name:'Above4GDecoding',  type:'Enumeration', def:'Enabled',  disp:'Above 4G Decoding',  dispZh:'4G以上解码',    val:[E('Enabled'),E('Disabled')], menu:'./Advanced', rb:true },
        { name:'ResizableBAR',     type:'Enumeration', def:'Enabled',  disp:'Re-Size BAR',        dispZh:'可调整BAR',     val:[E('Enabled'),E('Disabled')], menu:'./Advanced', rb:true },
        { name:'PcieMaxLinkSpeed', type:'Enumeration', def:'Auto',     disp:'PCIe Max Speed',     dispZh:'PCIe 最大速率', val:[E('Auto'),E('Gen3'),E('Gen4'),E('Gen5')], menu:'./Advanced', rb:true },
        { name:'PcieAspmSupport',  type:'Enumeration', def:'Enabled',  disp:'PCIe ASPM',          dispZh:'PCIe ASPM',     val:[E('Enabled'),E('Disabled')], menu:'./Advanced' },
        { name:'UsbPortsAll',      type:'Enumeration', def:'Enabled',  disp:'All USB Ports',      dispZh:'所有USB',       val:[E('Enabled'),E('Disabled')], menu:'./Advanced', rb:true },
        { name:'UsbFrontPorts',    type:'Enumeration', def:'Enabled',  disp:'Front USB',          dispZh:'前置USB',       val:[E('Enabled'),E('Disabled')], menu:'./Advanced' },
        { name:'UsbRearPorts',     type:'Enumeration', def:'Enabled',  disp:'Rear USB',           dispZh:'后置USB',       val:[E('Enabled'),E('Disabled')], menu:'./Advanced' },
        { name:'SerialAEnabled',   type:'Enumeration', def:'Enabled',  disp:'Serial COM1',        dispZh:'串口 COM1',     val:[E('Enabled'),E('Disabled')], menu:'./Advanced', rb:true },
        { name:'SerialBaudRate',   type:'Enumeration', def:'115200',   disp:'Serial Baud Rate',   dispZh:'串口波特率',    val:[E('9600'),E('19200'),E('38400'),E('57600'),E('115200')], menu:'./Advanced' },
        { name:'ConsoleRedirect',  type:'Enumeration', def:'Enabled',  disp:'Console Redirection',dispZh:'控制台重定向',  val:[E('Enabled'),E('Disabled')], menu:'./Advanced' },
        { name:'PerfProfile',      type:'Enumeration', def:'Efficient',disp:'Performance Profile',dispZh:'性能配置档',    val:[EN('MaxPerf','Max'),EN('Efficient','Efficient'),EN('Latency','Latency Opt')], menu:'./Advanced', rb:true },
        { name:'SubNumaClustering',type:'Enumeration', def:'Disabled', disp:'SNC',                 dispZh:'子NUMA集群',    val:[E('Enabled'),E('Disabled')], menu:'./Advanced', rb:true },

        // Server Mgmt
        { name:'BmcWatchdog',         type:'Enumeration', def:'Enabled',  disp:'BMC Watchdog',     dispZh:'BMC 看门狗',    val:[E('Enabled'),E('Disabled')], menu:'./ServerMgmt' },
        { name:'BmcWatchdogTimeout',  type:'Integer',     def:300,       disp:'Watchdog Timeout',  dispZh:'超时(秒)',       lb:30, ub:1800, st:30, menu:'./ServerMgmt' },
        { name:'OsWatchdogTimer',     type:'Enumeration', def:'Enabled',  disp:'OS Watchdog',       dispZh:'OS 看门狗',     val:[E('Enabled'),E('Disabled')], menu:'./ServerMgmt' },
        { name:'SolEnabled',          type:'Enumeration', def:'Enabled',  disp:'Serial Over LAN',   dispZh:'SOL 局域网串口',val:[E('Enabled'),E('Disabled')], menu:'./ServerMgmt' },
        { name:'BmcLanMode',          type:'Enumeration', def:'Dedicated',disp:'BMC LAN Mode',      dispZh:'BMC 网口模式',  val:[E('Dedicated'),EN('SharedLOM','Shared LOM')], sc:'阿里', menu:'./ServerMgmt' },
        { name:'BmcIPv4Address',      type:'String',      def:'192.168.1.101',disp:'BMC IPv4',      dispZh:'BMC IPv4',      ro:true, menu:'./ServerMgmt' },
        { name:'BmcMacAddress',       type:'String',      def:'00:1B:2D:4E:5F:60',disp:'BMC MAC',   dispZh:'BMC MAC',       ro:true, menu:'./ServerMgmt' },

        // Misc
        { name:'NumLock',       type:'Enumeration', def:'On',      disp:'NumLock',             dispZh:'NumLock',       val:[E('On'),E('Off')], menu:'./Misc' },
        { name:'CpuErrLog',     type:'Enumeration', def:'Enabled', disp:'CPU Error Log',        dispZh:'CPU 错误日志',  val:[E('Enabled'),E('Disabled')], menu:'./Misc' },
        { name:'MemErrLog',     type:'Enumeration', def:'Enabled', disp:'Memory Error Log',     dispZh:'内存错误日志',  val:[E('Enabled'),E('Disabled')], menu:'./Misc' },
        { name:'WheaSupport',   type:'Enumeration', def:'Enabled', disp:'WHEA Support',         dispZh:'WHEA',          val:[E('Enabled'),E('Disabled')], menu:'./Misc' },
    ]
};

/* ================================================================
 * 机型 3: FusionServer 5288 V7 — 4U2P 大容量存储
 * ================================================================ */
const MODEL_5288V7 = {
    productName: 'FusionServer 5288 V7',
    systemId: 'FUSION_5288V7',
    firmwareVersion: 'iBMC V685 v3.40',
    attrs: [
        { name:'BiosVersion',        type:'String', def:'V685', disp:'BIOS Version',   dispZh:'BIOS 版本',     menu:'./', ro:true },
        { name:'ProductName',        type:'String', def:'FusionServer 5288 V7', disp:'Product Name',dispZh:'产品名称', menu:'./', ro:true },
        { name:'BiosReleaseDate',    type:'String', def:'2026-02-10', disp:'BIOS Date',dispZh:'发布日期', menu:'./', ro:true },

        // Processor
        { name:'IntelHyperThreading',      type:'Enumeration', def:'Enabled',  disp:'Hyper-Threading',    dispZh:'超线程',       val:[E('Enabled'),E('Disabled')], menu:'./Processor', rb:true },
        { name:'ActiveCoresPerProcessor',  type:'Integer',     def:0,          disp:'Active Cores',       dispZh:'启用核心数',   lb:0, ub:56, st:1, menu:'./Processor', rb:true },
        { name:'IntelVT',                  type:'Enumeration', def:'Enabled',  disp:'Intel VT-x',         dispZh:'VT-x',          val:[E('Enabled'),E('Disabled')], menu:'./Processor', rb:true },
        { name:'IntelVTd',                 type:'Enumeration', def:'Enabled',  disp:'Intel VT-d',         dispZh:'VT-d',          val:[E('Enabled'),E('Disabled')], menu:'./Processor', rb:true },
        { name:'ProcTurboMode',            type:'Enumeration', def:'Enabled',  disp:'Turbo Boost',        dispZh:'Turbo',         val:[E('Enabled'),E('Disabled')], menu:'./Processor', rb:true },
        { name:'ProcCStates',              type:'Enumeration', def:'Enabled',  disp:'C-States',           dispZh:'C状态',         val:[E('Enabled'),E('Disabled')], menu:'./Processor' },
        { name:'ProcConfigTDP',            type:'Enumeration', def:'Maximum',  disp:'Configurable TDP',   dispZh:'可配置TDP',    help:'Storage workloads favor max TDP.', val:[E('Nominal'),E('Maximum')], menu:'./Processor', sc:'腾讯', rb:true },

        // Memory
        { name:'TotalMemSize',  type:'String', def:'512 GB',disp:'Total Memory',  dispZh:'总内存',  menu:'./Memory', ro:true },
        { name:'MemSpeed',      type:'Enumeration', def:'Auto',disp:'Memory Speed',  dispZh:'内存速率', val:[E('Auto'),E('4800'),E('4400'),E('4000')], menu:'./Memory', rb:true },
        { name:'MemVoltage',    type:'Enumeration', def:'1.1V',disp:'Memory Voltage',dispZh:'内存电压', val:[E('1.1V'),E('1.2V')], menu:'./Memory' },
        { name:'MemPatrolScrub',type:'Enumeration', def:'Enabled',disp:'Patrol Scrub', dispZh:'内存巡检', val:[E('Enabled'),E('Disabled')], menu:'./Memory' },
        { name:'MemNumaMode',   type:'Enumeration', def:'Enabled',disp:'NUMA',         dispZh:'NUMA',    val:[E('Enabled'),E('Disabled')], menu:'./Memory', rb:true },

        // ---- Storage (big differentiator — 44 drive bays) ----
        { name:'SataController',  type:'Enumeration', def:'Enabled',  disp:'SATA Controller',    dispZh:'SATA 控制器',    val:[E('Enabled'),E('Disabled')], menu:'./Storage', rb:true },
        { name:'SataMode',        type:'Enumeration', def:'RAID',     disp:'SATA Mode',          dispZh:'SATA 模式',      val:[E('AHCI'),E('RAID')], menu:'./Storage', rb:true },
        { name:'SataHotplugCap',  type:'Enumeration', def:'Enabled',  disp:'SATA Hot Plug',      dispZh:'SATA 热插拔',    val:[E('Enabled'),E('Disabled')], menu:'./Storage' },
        // Port groups for 44 drives
        { name:'SataPorts_0_7',   type:'Enumeration', def:'Enabled', disp:'SATA Ports 0-7',     dispZh:'SATA 端口0-7',   val:[E('Enabled'),E('Disabled')], menu:'./Storage' },
        { name:'SataPorts_8_15',  type:'Enumeration', def:'Enabled', disp:'SATA Ports 8-15',    dispZh:'SATA 端口8-15',  val:[E('Enabled'),E('Disabled')], menu:'./Storage' },
        { name:'SataPorts_16_23', type:'Enumeration', def:'Enabled', disp:'SATA Ports 16-23',   dispZh:'SATA 端口16-23', val:[E('Enabled'),E('Disabled')], menu:'./Storage' },
        { name:'SataPorts_24_31', type:'Enumeration', def:'Enabled', disp:'SATA Ports 24-31',   dispZh:'SATA 端口24-31', val:[E('Enabled'),E('Disabled')], menu:'./Storage' },
        { name:'SataPorts_32_43', type:'Enumeration', def:'Enabled', disp:'SATA Ports 32-43',   dispZh:'SATA 端口32-43', val:[E('Enabled'),E('Disabled')], menu:'./Storage' },
        { name:'NvmeRaidMode',    type:'Enumeration', def:'Disabled',disp:'NVMe RAID',          dispZh:'NVMe RAID',      val:[E('Enabled'),E('Disabled')], menu:'./Storage', rb:true },
        { name:'OnboardRaidCtrl', type:'Enumeration', def:'Enabled', disp:'Onboard RAID Ctrl',  dispZh:'板载RAID控制器',  help:'LSI 9660 for large arrays.', helpZh:'大阵列LSI 9660。', val:[E('Enabled'),E('Disabled')], menu:'./Storage', sc:'腾讯', rb:true },
        { name:'StorageThermalCtrl', type:'Enumeration', def:'Enabled',disp:'Storage Thermal',   dispZh:'存储散热控制',   help:'Active cooling for high-density drives.', helpZh:'高密度硬盘主动散热。', val:[E('Enabled'),E('Disabled')], menu:'./Storage' },
        // Write cache / read ahead for HDD arrays
        { name:'SataWriteCache',  type:'Enumeration', def:'Enabled', disp:'SATA Write Cache',   dispZh:'SATA 写缓存',     val:[E('Enabled'),E('Disabled')], menu:'./Storage' },
        { name:'SataReadAhead',   type:'Enumeration', def:'Enabled', disp:'SATA Read Ahead',    dispZh:'SATA 预读',       val:[E('Enabled'),E('Disabled')], menu:'./Storage' },
        { name:'JBOD_Mode',       type:'Enumeration', def:'Disabled',disp:'JBOD Mode',          dispZh:'JBOD 直通模式',   help:'Pass-through disks without RAID.', helpZh:'磁盘直通不组RAID。', val:[E('Enabled'),E('Disabled')], menu:'./Storage', rb:true },

        // Network
        { name:'NicPXEStack',   type:'Enumeration', def:'Enabled',disp:'UEFI PXE Stack',  dispZh:'PXE 协议栈',  val:[E('Enabled'),E('Disabled')], menu:'./Network' },
        { name:'NicIPv4PXE',    type:'Enumeration', def:'Enabled',disp:'IPv4 PXE',        dispZh:'IPv4 PXE',     val:[E('Enabled'),E('Disabled')], menu:'./Network' },
        { name:'NicBootMode',   type:'Enumeration', def:'UEFI',   disp:'NIC Boot Mode',   dispZh:'网卡启动',     val:[E('UEFI'),E('Legacy PXE')], menu:'./Network', rb:true },

        // Boot
        { name:'BootMode',      type:'Enumeration', def:'Uefi',    disp:'Boot Mode',        dispZh:'启动模式',      val:[EN('Uefi','UEFI'),EN('LegacyBios','Legacy BIOS')], menu:'./Boot', rb:true },
        { name:'FastBoot',      type:'Enumeration', def:'Disabled',disp:'Fast Boot',        dispZh:'快速启动',      val:[E('Enabled'),E('Disabled')], menu:'./Boot' },
        { name:'QuietBoot',     type:'Enumeration', def:'Enabled', disp:'Quiet Boot',       dispZh:'安静启动',      val:[E('Enabled'),E('Disabled')], menu:'./Boot' },
        { name:'BootTimeout',   type:'Integer',     def:10,       disp:'Boot Timeout (s)',  dispZh:'启动超时(秒)',  lb:1, ub:65535, st:1, menu:'./Boot' },
        { name:'BootRetryCount',type:'Integer',     def:5,        disp:'Boot Retry Count',  dispZh:'重试次数',      lb:0, ub:10, st:1, menu:'./Boot' },

        // Security
        { name:'SecureBoot',     type:'Enumeration', def:'Disabled', disp:'Secure Boot',       dispZh:'安全启动',    val:[E('Enabled'),E('Disabled')], ro:true, menu:'./Security', rb:true },
        { name:'TpmState',       type:'Enumeration', def:'Enabled',  disp:'TPM State',         dispZh:'TPM',         val:[E('Enabled'),E('Disabled')], menu:'./Security', rb:true },
        { name:'AdminPassword',  type:'Password',    def:null,       disp:'Admin Password',    dispZh:'管理员密码',  mn:8, mx:32, menu:'./Security' },

        // Power
        { name:'PowerPolicy',          type:'Enumeration', def:'Efficient',disp:'Power Policy',   dispZh:'电源策略',    val:[EN('Perf','Max Performance'),EN('Efficient','Efficient')], menu:'./Power', rb:true },
        { name:'AcPowerRestorePolicy', type:'Enumeration', def:'On',       disp:'AC Power Restore',dispZh:'交流电恢复',  val:[EN('Off','Always Off'),EN('On','Always On'),EN('LastState','Last State')], menu:'./Power' },
        { name:'PowerOnByLAN',         type:'Enumeration', def:'Disabled', disp:'Wake-on-LAN',    dispZh:'网络唤醒',     val:[E('Enabled'),E('Disabled')], menu:'./Power' },
        { name:'FanControlMode',       type:'Enumeration', def:'Auto',     disp:'Fan Control',    dispZh:'风扇控制',     val:[E('Auto'),E('Manual')], menu:'./Power' },
        { name:'FanSpeedLowLimit',     type:'Integer',     def:15,         disp:'Fan Min (%)',    dispZh:'风扇最低(%)',  help:'4U lower min fan for noise.', lb:5, ub:100, st:5, menu:'./Power' },
        { name:'PowerCapEnable',       type:'Enumeration', def:'Enabled',  disp:'Power Capping',   dispZh:'功率封顶',     val:[E('Enabled'),E('Disabled')], sc:'腾讯', menu:'./Power' },
        { name:'PowerCapValue',        type:'Integer',     def:1400,       disp:'Power Cap (W)',   dispZh:'功率封顶(瓦)', lb:200, ub:3500, st:10, sc:'腾讯', menu:'./Power' },

        // Advanced
        { name:'HardwarePrefetcher',type:'Enumeration', def:'Enabled', disp:'Hardware Prefetcher',dispZh:'硬件预取器',  val:[E('Enabled'),E('Disabled')], menu:'./Advanced', rb:true },
        { name:'AdjacentCachePrefetch',type:'Enumeration',def:'Enabled',disp:'Adjacent Prefetch', dispZh:'邻接预取',    val:[E('Enabled'),E('Disabled')], menu:'./Advanced', rb:true },
        { name:'AESNI',             type:'Enumeration', def:'Enabled', disp:'Intel AES-NI',       dispZh:'AES-NI',       val:[E('Enabled'),E('Disabled')], menu:'./Advanced', rb:true },
        { name:'Above4GDecoding',   type:'Enumeration', def:'Enabled', disp:'Above 4G Decoding',  dispZh:'4G以上解码',   val:[E('Enabled'),E('Disabled')], menu:'./Advanced', rb:true },
        { name:'PcieMaxLinkSpeed',  type:'Enumeration', def:'Auto',    disp:'PCIe Max Speed',     dispZh:'PCIe 速率',    val:[E('Auto'),E('Gen3'),E('Gen4'),E('Gen5')], menu:'./Advanced', rb:true },
        { name:'PcieAspmSupport',   type:'Enumeration', def:'Disabled',disp:'PCIe ASPM',          dispZh:'PCIe ASPM',    help:'Disabled for storage latency stability.', val:[E('Enabled'),E('Disabled')], menu:'./Advanced' },
        { name:'UsbPortsAll',       type:'Enumeration', def:'Enabled', disp:'All USB Ports',      dispZh:'所有USB',      val:[E('Enabled'),E('Disabled')], menu:'./Advanced', rb:true },
        { name:'SerialAEnabled',    type:'Enumeration', def:'Enabled', disp:'Serial COM1',        dispZh:'串口 COM1',    val:[E('Enabled'),E('Disabled')], menu:'./Advanced', rb:true },
        { name:'SerialBaudRate',    type:'Enumeration', def:'115200',  disp:'Serial Baud',        dispZh:'波特率',       val:[E('9600'),E('19200'),E('38400'),E('57600'),E('115200')], menu:'./Advanced' },
        { name:'ConsoleRedirect',   type:'Enumeration', def:'Enabled', disp:'Console Redir',      dispZh:'控制台重定向', val:[E('Enabled'),E('Disabled')], menu:'./Advanced' },
        { name:'PerfProfile',       type:'Enumeration', def:'Throughput',disp:'Perf Profile',     dispZh:'性能配置档',   help:'Throughput optimized for streaming I/O.', val:[EN('Throughput','Throughput'),EN('Efficient','Efficient'),EN('MaxPerf','Max')], menu:'./Advanced', rb:true },

        // Server Mgmt
        { name:'BmcWatchdog',        type:'Enumeration', def:'Enabled',  disp:'BMC Watchdog',    dispZh:'BMC 看门狗',   val:[E('Enabled'),E('Disabled')], menu:'./ServerMgmt' },
        { name:'BmcWatchdogTimeout', type:'Integer',     def:600,        disp:'Watchdog Timeout',dispZh:'超时(秒)',      lb:60, ub:3600, st:60, menu:'./ServerMgmt' },
        { name:'OsWatchdogTimer',    type:'Enumeration', def:'Enabled',  disp:'OS Watchdog',     dispZh:'OS 看门狗',    val:[E('Enabled'),E('Disabled')], menu:'./ServerMgmt' },
        { name:'SolEnabled',         type:'Enumeration', def:'Enabled',  disp:'Serial Over LAN', dispZh:'SOL',          val:[E('Enabled'),E('Disabled')], menu:'./ServerMgmt' },
        { name:'BmcLanMode',         type:'Enumeration', def:'Dedicated',disp:'BMC LAN Mode',    dispZh:'BMC 网口模式', val:[E('Dedicated'),EN('SharedLOM','Shared LOM')], sc:'腾讯', menu:'./ServerMgmt' },
        { name:'BmcIPv4Address',     type:'String',      def:'10.0.0.110',disp:'BMC IPv4',      dispZh:'BMC IPv4',     ro:true, menu:'./ServerMgmt' },
        { name:'BmcMacAddress',      type:'String',      def:'00:1E:3F:5A:6B:7C',disp:'BMC MAC',dispZh:'BMC MAC',     ro:true, menu:'./ServerMgmt' },

        // Misc
        { name:'NumLock',       type:'Enumeration', def:'On',     disp:'NumLock',         dispZh:'NumLock',       val:[E('On'),E('Off')], menu:'./Misc' },
        { name:'CpuErrLog',     type:'Enumeration', def:'Enabled',disp:'CPU Error Log',    dispZh:'CPU 错误日志',  val:[E('Enabled'),E('Disabled')], menu:'./Misc' },
        { name:'MemErrLog',     type:'Enumeration', def:'Enabled',disp:'Mem Error Log',    dispZh:'内存错误日志',  val:[E('Enabled'),E('Disabled')], menu:'./Misc' },
        { name:'PcieErrLog',    type:'Enumeration', def:'Enabled',disp:'PCIe Error Log',   dispZh:'PCIe 错误日志', val:[E('Enabled'),E('Disabled')], menu:'./Misc' },
        { name:'WheaSupport',   type:'Enumeration', def:'Enabled',disp:'WHEA Support',     dispZh:'WHEA',          val:[E('Enabled'),E('Disabled')], menu:'./Misc' },
    ]
};

/* ================================================================
 * 机型 4: FusionServer 2488H V7 — 2U4P 高端多路
 * ================================================================ */
const MODEL_2488HV7 = {
    productName: 'FusionServer 2488H V7',
    systemId: 'FUSION_2488HV7',
    firmwareVersion: 'iBMC V695 v3.48',
    attrs: [
        { name:'BiosVersion',        type:'String', def:'V695', disp:'BIOS Version',  dispZh:'BIOS 版本',   menu:'./', ro:true },
        { name:'ProductName',        type:'String', def:'FusionServer 2488H V7',disp:'Product Name',dispZh:'产品名称', menu:'./', ro:true },
        { name:'BiosReleaseDate',    type:'String', def:'2026-04-01',disp:'BIOS Date',dispZh:'发布日期', menu:'./', ro:true },
        { name:'CpuMicrocodeVersion',type:'String', def:'0x3C0001A0',disp:'CPU Microcode',dispZh:'CPU 微码',  menu:'./', ro:true },

        // ---- Processor (4P specific: UPI, NUMA per socket, more cores) ----
        { name:'IntelHyperThreading',      type:'Enumeration', def:'Enabled',  disp:'Hyper-Threading',       dispZh:'超线程',          val:[E('Enabled'),E('Disabled')], menu:'./Processor', rb:true },
        { name:'ActiveCoresPerProcessor',  type:'Integer',     def:0,          disp:'Active Cores/Proc',     dispZh:'每处理器核心数',  lb:0, ub:60, st:1, menu:'./Processor', rb:true },
        { name:'IntelVT',                  type:'Enumeration', def:'Enabled',  disp:'Intel VT-x',            dispZh:'VT-x',             val:[E('Enabled'),E('Disabled')], menu:'./Processor', rb:true },
        { name:'IntelVTd',                 type:'Enumeration', def:'Enabled',  disp:'Intel VT-d',            dispZh:'VT-d',             val:[E('Enabled'),E('Disabled')], menu:'./Processor', rb:true },
        { name:'ProcTurboMode',            type:'Enumeration', def:'Enabled',  disp:'Turbo Boost',           dispZh:'Turbo',            val:[E('Enabled'),E('Disabled')], menu:'./Processor', rb:true },
        { name:'ProcCStates',              type:'Enumeration', def:'Enabled',  disp:'C-States',              dispZh:'C状态',            val:[E('Enabled'),E('Disabled')], menu:'./Processor' },
        { name:'ProcConfigTDP',            type:'Enumeration', def:'Nominal',  disp:'Configurable TDP',      dispZh:'可配置TDP',       val:[E('Nominal'),E('Maximum'),EN('Reduced','Reduced')], menu:'./Processor', sc:'华为', rb:true },
        // 4P interconnect
        { name:'UpiLinkSpeed',             type:'Enumeration', def:'Auto',     disp:'UPI Link Speed',        dispZh:'UPI 链路速率',     help:'Ultra Path Interconnect speed between CPUs.', helpZh:'CPU间UPI互联速率。', val:[E('Auto'),E('16GT'),E('20GT'),E('24GT')], menu:'./Processor', rb:true },
        { name:'UpiLinkEnable',            type:'Integer',     def:3,          disp:'UPI Links Per Socket',  dispZh:'每路UPI链路数',    help:'Active UPI links per CPU socket.', helpZh:'每CPU活动UPI链路。', lb:1, ub:3, st:1, menu:'./Processor', rb:true },
        { name:'UpiPrefetch',              type:'Enumeration', def:'Enabled',  disp:'UPI Prefetch',          dispZh:'UPI 预取',         help:'Prefetch across UPI for cross-socket memory.', val:[E('Enabled'),E('Disabled')], menu:'./Processor', rb:true },
        { name:'ClxNumaPerSocket',         type:'Enumeration', def:'Auto',     disp:'NUMA Per Socket',       dispZh:'每路NUMA域数',     help:'NUMA domains per socket for 4P.', val:[E('Auto'),E('1'),E('2'),E('4')], menu:'./Processor', rb:true },
        { name:'XptPrefetch',              type:'Enumeration', def:'Enabled',  disp:'XPT Remote Prefetch',   dispZh:'XPT 远程预取',     help:'Remote socket cache prefetch for 4P.', val:[E('Enabled'),E('Disabled')], menu:'./Processor', rb:true },
        { name:'StaleAtoS',                type:'Enumeration', def:'Enabled',  disp:'Stale AtoS',            dispZh:'陈旧AtoS优化',     help:'Directory-based stale A-to-S optimization.', val:[E('Enabled'),E('Disabled')], menu:'./Processor', rb:true },

        // Memory (4P — full mirror, interleave granularity)
        { name:'TotalMemSize',        type:'String', def:'2048 GB',disp:'Total Memory',       dispZh:'总内存',     menu:'./Memory', ro:true },
        { name:'MemSpeed',            type:'Enumeration', def:'Auto',disp:'Memory Speed',     dispZh:'内存速率',   val:[E('Auto'),E('5600'),E('5200'),E('4800'),E('4400')], menu:'./Memory', rb:true },
        { name:'MemVoltage',          type:'Enumeration', def:'1.1V',disp:'Memory Voltage',   dispZh:'内存电压',   val:[E('1.1V'),E('1.2V')], menu:'./Memory' },
        { name:'MemPatrolScrub',      type:'Enumeration', def:'Enabled',disp:'Patrol Scrub',  dispZh:'内存巡检',   val:[E('Enabled'),E('Disabled')], menu:'./Memory' },
        { name:'MemNumaMode',         type:'Enumeration', def:'Enabled',disp:'NUMA Optimize', dispZh:'NUMA 优化',  val:[E('Enabled'),E('Disabled')], menu:'./Memory', rb:true },
        { name:'MemMirrorMode',       type:'Enumeration', def:'Disabled',disp:'Memory Mirror',dispZh:'内存镜像',   help:'Full mirror halves capacity; critical for 4P RAS.', val:[E('Disabled'),E('Enabled'),E('Spare'),EN('FullMirror','Full Mirror')], menu:'./Memory', rb:true },
        { name:'MemRASMode',          type:'Enumeration', def:'MaxRel',disp:'Memory RAS Mode', dispZh:'内存RAS',    help:'4P mission-critical RAS config.', val:[EN('MaxPerf','Max Performance'),EN('MaxRel','Max Reliability'),EN('ADDDC','ADDDC')], menu:'./Memory', sc:'华为', rb:true },
        { name:'MemInterleaveGran',   type:'Enumeration', def:'Auto',disp:'Interleave Granularity',dispZh:'交织粒度',help:'Memory interleave granularity for 4P access.', val:[E('Auto'),E('256B'),E('4KB'),E('1GB')], menu:'./Memory', rb:true },
        { name:'MemRankSparing',      type:'Enumeration', def:'Enabled',disp:'Rank Sparing',   dispZh:'Rank 备用',   help:'Hot-spare memory ranks for 4P RAS.', val:[E('Enabled'),E('Disabled')], menu:'./Memory', rb:true },

        // Storage
        { name:'SataController',  type:'Enumeration', def:'Enabled',disp:'SATA Controller',dispZh:'SATA 控制器',val:[E('Enabled'),E('Disabled')], menu:'./Storage', rb:true },
        { name:'SataMode',        type:'Enumeration', def:'AHCI',   disp:'SATA Mode',      dispZh:'SATA 模式',  val:[E('AHCI'),E('RAID')], menu:'./Storage', rb:true },
        { name:'NvmeRaidMode',    type:'Enumeration', def:'Disabled',disp:'NVMe RAID',     dispZh:'NVMe RAID',   val:[E('Enabled'),E('Disabled')], menu:'./Storage', rb:true },
        { name:'SataHotplugCap',  type:'Enumeration', def:'Enabled',disp:'SATA Hot Plug',  dispZh:'热插拔',     val:[E('Enabled'),E('Disabled')], menu:'./Storage' },
        { name:'OnboardRaidCtrl', type:'Enumeration', def:'Enabled',disp:'Onboard RAID',   dispZh:'板载RAID',   val:[E('Enabled'),E('Disabled')], menu:'./Storage', sc:'华为', rb:true },

        // Network
        { name:'NicPXEStack',  type:'Enumeration', def:'Enabled', disp:'UEFI PXE Stack',dispZh:'PXE 协议栈',val:[E('Enabled'),E('Disabled')], menu:'./Network' },
        { name:'NicIPv4PXE',   type:'Enumeration', def:'Enabled', disp:'IPv4 PXE',      dispZh:'IPv4 PXE',  val:[E('Enabled'),E('Disabled')], menu:'./Network' },
        { name:'NicIPv6PXE',   type:'Enumeration', def:'Enabled', disp:'IPv6 PXE',      dispZh:'IPv6 PXE',  val:[E('Enabled'),E('Disabled')], menu:'./Network' },
        { name:'NicBootMode',  type:'Enumeration', def:'UEFI',    disp:'NIC Boot Mode', dispZh:'网卡启动',  val:[E('UEFI'),E('Legacy PXE')], menu:'./Network', rb:true },

        // Boot
        { name:'BootMode',      type:'Enumeration', def:'Uefi',    disp:'Boot Mode',       dispZh:'启动模式',     val:[EN('Uefi','UEFI'),EN('LegacyBios','Legacy BIOS')], menu:'./Boot', rb:true },
        { name:'FastBoot',      type:'Enumeration', def:'Disabled',disp:'Fast Boot',       dispZh:'快速启动',     val:[E('Enabled'),E('Disabled')], menu:'./Boot' },
        { name:'QuietBoot',     type:'Enumeration', def:'Disabled',disp:'Quiet Boot',      dispZh:'安静启动',     val:[E('Enabled'),E('Disabled')], menu:'./Boot' },
        { name:'BootTimeout',   type:'Integer',     def:10,       disp:'Boot Timeout (s)', dispZh:'启动超时(秒)', lb:1, ub:65535, st:1, menu:'./Boot' },
        { name:'BootRetryCount',type:'Integer',     def:1,        disp:'Boot Retry Count', dispZh:'重试次数',     lb:0, ub:3, st:1, menu:'./Boot' },

        // Security
        { name:'SecureBoot',        type:'Enumeration', def:'Disabled',disp:'Secure Boot',      dispZh:'安全启动',    val:[E('Enabled'),E('Disabled')], ro:true, menu:'./Security', rb:true },
        { name:'SecureBootMode',    type:'Enumeration', def:'Standard',disp:'Secure Boot Mode', dispZh:'安全启动模式',val:[E('Standard'),E('Custom')], menu:'./Security', rb:true },
        { name:'TpmState',          type:'Enumeration', def:'Enabled', disp:'TPM State',        dispZh:'TPM',         val:[E('Enabled'),E('Disabled')], menu:'./Security', rb:true },
        { name:'TpmActivePcrBanks', type:'Enumeration', def:'SHA256',  disp:'TPM PCR Banks',    dispZh:'PCR 存储区',  val:[E('SHA1'),E('SHA256'),EN('SHA1_SHA256','Both')], menu:'./Security', rb:true },
        { name:'AdminPassword',     type:'Password',    def:null,      disp:'Admin Password',   dispZh:'管理员密码',  mn:8, mx:32, menu:'./Security' },
        { name:'UserPassword',      type:'Password',    def:null,      disp:'User Password',    dispZh:'用户密码',    mn:8, mx:32, menu:'./Security' },

        // Power (4P — high power budget)
        { name:'PowerPolicy',          type:'Enumeration', def:'MaxPerf', disp:'Power Policy',    dispZh:'电源策略',      val:[EN('MaxPerf','Max Performance'),EN('Efficient','Efficient')], menu:'./Power', rb:true },
        { name:'AcPowerRestorePolicy', type:'Enumeration', def:'Off',     disp:'AC Restore',      dispZh:'交流电恢复',     val:[EN('Off','Always Off'),EN('On','Always On'),EN('LastState','Last State')], menu:'./Power' },
        { name:'PowerOnDelay',         type:'Integer',     def:10,        disp:'Power-On Delay',   dispZh:'开机延迟(秒)',   help:'Staggered 4P power-on sequence.', lb:0, ub:120, st:5, menu:'./Power' },
        { name:'FanControlMode',       type:'Enumeration', def:'Auto',    disp:'Fan Control',      dispZh:'风扇控制',       val:[E('Auto'),E('Manual')], menu:'./Power' },
        { name:'FanSpeedLowLimit',     type:'Integer',     def:25,        disp:'Fan Min (%)',      dispZh:'风扇最低(%)',    lb:10, ub:100, st:5, menu:'./Power' },
        { name:'PowerCapEnable',       type:'Enumeration', def:'Enabled', disp:'Power Capping',    dispZh:'功率封顶',       val:[E('Enabled'),E('Disabled')], sc:'华为', menu:'./Power' },
        { name:'PowerCapValue',        type:'Integer',     def:2000,      disp:'Power Cap (W)',    dispZh:'功率封顶(瓦)',   lb:200, ub:4000, st:10, sc:'华为', menu:'./Power' },

        // Advanced (all prefetchers + 4P specific)
        { name:'HardwarePrefetcher',    type:'Enumeration', def:'Enabled', disp:'Hardware Prefetcher',dispZh:'硬件预取器',   val:[E('Enabled'),E('Disabled')], menu:'./Advanced', rb:true },
        { name:'AdjacentCachePrefetch', type:'Enumeration', def:'Enabled', disp:'Adjacent Prefetch',  dispZh:'邻接预取',     val:[E('Enabled'),E('Disabled')], menu:'./Advanced', rb:true },
        { name:'DCUStreamPrefetcher',   type:'Enumeration', def:'Enabled', disp:'DCU Stream Pre',     dispZh:'DCU 流预取',   val:[E('Enabled'),E('Disabled')], menu:'./Advanced', rb:true },
        { name:'DCUIPPrefetcher',       type:'Enumeration', def:'Enabled', disp:'DCU IP Pre',         dispZh:'DCU IP 预取',  val:[E('Enabled'),E('Disabled')], menu:'./Advanced', rb:true },
        { name:'LLCPrefetch',           type:'Enumeration', def:'Enabled', disp:'LLC Prefetch',       dispZh:'LLC 预取',     val:[E('Enabled'),E('Disabled')], menu:'./Advanced', rb:true },
        { name:'AESNI',                 type:'Enumeration', def:'Enabled', disp:'Intel AES-NI',       dispZh:'AES-NI',        val:[E('Enabled'),E('Disabled')], menu:'./Advanced', rb:true },
        { name:'IntelSGX',              type:'Enumeration', def:'Disabled',disp:'Intel SGX',          dispZh:'SGX',           val:[E('Enabled'),E('Disabled')], menu:'./Advanced', rb:true },
        { name:'IntelTME',              type:'Enumeration', def:'Enabled', disp:'Intel TME',          dispZh:'全内存加密',    val:[E('Enabled'),E('Disabled')], menu:'./Advanced', rb:true },
        { name:'Above4GDecoding',   type:'Enumeration', def:'Enabled',  disp:'Above 4G Decoding', dispZh:'4G以上解码',    val:[E('Enabled'),E('Disabled')], menu:'./Advanced', rb:true },
        { name:'ResizableBAR',      type:'Enumeration', def:'Enabled',  disp:'Re-Size BAR',       dispZh:'可调整BAR',     val:[E('Enabled'),E('Disabled')], menu:'./Advanced', rb:true },
        { name:'PcieMaxLinkSpeed',  type:'Enumeration', def:'Auto',     disp:'PCIe Max Speed',    dispZh:'PCIe 速率',     val:[E('Auto'),E('Gen4'),E('Gen5')], menu:'./Advanced', rb:true },
        { name:'PcieAspmSupport',   type:'Enumeration', def:'Disabled', disp:'PCIe ASPM',         dispZh:'PCIe ASPM',     help:'Disabled for 4P latency stability.', val:[E('Enabled'),E('Disabled')], menu:'./Advanced' },
        { name:'SriovPCIe',         type:'Enumeration', def:'Enabled',  disp:'SR-IOV (PCIe)',     dispZh:'PCIe SR-IOV',   val:[E('Enabled'),E('Disabled')], menu:'./Advanced', rb:true },
        { name:'Pcie10BitTag',      type:'Enumeration', def:'Enabled',  disp:'PCIe 10-bit Tag',   dispZh:'10位标签',      val:[E('Enabled'),E('Disabled')], menu:'./Advanced', rb:true },
        { name:'UsbPortsAll',       type:'Enumeration', def:'Enabled',  disp:'All USB Ports',     dispZh:'所有USB',       val:[E('Enabled'),E('Disabled')], menu:'./Advanced', rb:true },
        { name:'SerialAEnabled',    type:'Enumeration', def:'Enabled',  disp:'Serial COM1',       dispZh:'串口 COM1',     val:[E('Enabled'),E('Disabled')], menu:'./Advanced', rb:true },
        { name:'SerialBaudRate',    type:'Enumeration', def:'115200',   disp:'Serial Baud',       dispZh:'波特率',        val:[E('9600'),E('19200'),E('38400'),E('57600'),E('115200')], menu:'./Advanced' },
        { name:'ConsoleRedirect',   type:'Enumeration', def:'Enabled',  disp:'Console Redir',     dispZh:'控制台重定向',  val:[E('Enabled'),E('Disabled')], menu:'./Advanced' },
        { name:'PerfProfile',       type:'Enumeration', def:'MaxPerf',  disp:'Perf Profile',      dispZh:'性能配置档',    help:'MaxPerf for 4P database workloads.', val:[EN('MaxPerf','Max Performance'),EN('Efficient','Efficient'),EN('Latency','Latency Opt')], menu:'./Advanced', rb:true },
        { name:'EnergyEfficientTurbo',type:'Enumeration',def:'Disabled',disp:'Energy Eff Turbo',   dispZh:'节能Turbo',     val:[E('Enabled'),E('Disabled')], menu:'./Advanced' },
        { name:'SubNumaClustering',    type:'Enumeration',def:'Enabled',disp:'SNC',                 dispZh:'子NUMA集群',    val:[E('Enabled'),E('Disabled')], menu:'./Advanced', rb:true },
        { name:'DdrSpeedOptimization', type:'Enumeration',def:'Performance',disp:'DDR Speed Opt',   dispZh:'DDR 优化',      val:[EN('Balanced','Balanced'),EN('Performance','Performance'),EN('Stability','Stability')], menu:'./Advanced', rb:true },

        // Server Mgmt
        { name:'BmcWatchdog',         type:'Enumeration', def:'Enabled',  disp:'BMC Watchdog',     dispZh:'BMC 看门狗',   val:[E('Enabled'),E('Disabled')], menu:'./ServerMgmt' },
        { name:'BmcWatchdogTimeout',  type:'Integer',     def:600,        disp:'Watchdog Timeout', dispZh:'超时(秒)',     lb:60, ub:3600, st:60, menu:'./ServerMgmt' },
        { name:'OsWatchdogTimer',     type:'Enumeration', def:'Disabled', disp:'OS Watchdog',      dispZh:'OS 看门狗',    val:[E('Enabled'),E('Disabled')], menu:'./ServerMgmt' },
        { name:'SolEnabled',          type:'Enumeration', def:'Enabled',  disp:'Serial Over LAN',  dispZh:'SOL',          val:[E('Enabled'),E('Disabled')], menu:'./ServerMgmt' },
        { name:'BmcLanMode',          type:'Enumeration', def:'SharedLOM',disp:'BMC LAN Mode',     dispZh:'BMC 网口',     val:[E('Dedicated'),EN('SharedLOM','Shared LOM')], sc:'华为', menu:'./ServerMgmt' },
        { name:'ErpLot6PowerMode',    type:'Enumeration', def:'Enabled',  disp:'ERP Lot 6',        dispZh:'ERP 节能',     val:[E('Enabled'),E('Disabled')], menu:'./ServerMgmt' },
        { name:'SysMaintenanceSwitch',type:'Enumeration', def:'Disabled', disp:'Maintenance Switch',dispZh:'维护模式',    val:[E('Enabled'),E('Disabled')], menu:'./ServerMgmt' },
        { name:'BmcIPv4Address',      type:'String',      def:'10.20.30.1',disp:'BMC IPv4',       dispZh:'BMC IPv4',     ro:true, menu:'./ServerMgmt' },
        { name:'BmcMacAddress',       type:'String',      def:'00:1C:2E:4F:6A:8B',disp:'BMC MAC',  dispZh:'BMC MAC',      ro:true, menu:'./ServerMgmt' },

        // Misc
        { name:'NumLock',     type:'Enumeration', def:'On',      disp:'NumLock',         dispZh:'NumLock',       val:[E('On'),E('Off')], menu:'./Misc' },
        { name:'CpuErrLog',   type:'Enumeration', def:'Enabled', disp:'CPU Error Log',    dispZh:'CPU 错误日志',  val:[E('Enabled'),E('Disabled')], menu:'./Misc' },
        { name:'MemErrLog',   type:'Enumeration', def:'Enabled', disp:'Mem Error Log',    dispZh:'内存错误日志',  val:[E('Enabled'),E('Disabled')], menu:'./Misc' },
        { name:'PcieErrLog',  type:'Enumeration', def:'Enabled', disp:'PCIe Error Log',   dispZh:'PCIe 错误日志', val:[E('Enabled'),E('Disabled')], menu:'./Misc' },
        { name:'WheaSupport', type:'Enumeration', def:'Enabled', disp:'WHEA Support',     dispZh:'WHEA',          val:[E('Enabled'),E('Disabled')], menu:'./Misc' },
    ]
};

/* ================================================================
 * 机型 5: FusionServer 2288H V6 — 2U2P Ice Lake (V6 对比)
 * ================================================================ */
const MODEL_2288HV6 = {
    productName: 'FusionServer 2288H V6',
    systemId: 'FUSION_2288HV6',
    firmwareVersion: 'iBMC V590 v2.68',
    attrs: [
        { name:'BiosVersion',        type:'String', def:'V590',       disp:'BIOS Version',      dispZh:'BIOS 版本',  menu:'./', ro:true },
        { name:'BiosReleaseDate',    type:'String', def:'2025-11-20', disp:'BIOS Date',         dispZh:'发布日期',   menu:'./', ro:true },
        { name:'ProductName',        type:'String', def:'FusionServer 2288H V6', disp:'Product Name', dispZh:'产品名称', menu:'./', ro:true },
        { name:'BoardSerialNumber',  type:'String', def:'SNV62345678A',disp:'Board SN',         dispZh:'主板序列号', menu:'./', ro:true },
        { name:'CpuMicrocodeVersion',type:'String', def:'0xD0003B0',  disp:'CPU Microcode',     dispZh:'CPU 微码',   menu:'./', ro:true },

        // Processor (Ice Lake Xeon)
        { name:'IntelHyperThreading',      type:'Enumeration', def:'Enabled',  disp:'Hyper-Threading',    dispZh:'超线程',        val:[E('Enabled'),E('Disabled')], menu:'./Processor', rb:true },
        { name:'ActiveCoresPerProcessor',  type:'Integer',     def:0,          disp:'Active Cores',       dispZh:'启用核心数',    lb:0, ub:40, st:1, menu:'./Processor', rb:true },
        { name:'IntelVT',                  type:'Enumeration', def:'Enabled',  disp:'Intel VT-x',         dispZh:'VT-x',           val:[E('Enabled'),E('Disabled')], menu:'./Processor', rb:true },
        { name:'IntelVTd',                 type:'Enumeration', def:'Enabled',  disp:'Intel VT-d',         dispZh:'VT-d',           val:[E('Enabled'),E('Disabled')], menu:'./Processor', rb:true },
        { name:'ProcTurboMode',            type:'Enumeration', def:'Enabled',  disp:'Turbo Boost 2.0',    dispZh:'Turbo 加速',     val:[E('Enabled'),E('Disabled')], menu:'./Processor', rb:true },
        { name:'ProcCStates',              type:'Enumeration', def:'Enabled',  disp:'C-States',           dispZh:'C状态节能',      val:[E('Enabled'),E('Disabled')], menu:'./Processor' },
        { name:'ProcC1e',                  type:'Enumeration', def:'Enabled',  disp:'C1E Enhanced',       dispZh:'C1E 增强暂停',   val:[E('Enabled'),E('Disabled')], menu:'./Processor' },
        { name:'ProcConfigTDP',            type:'Enumeration', def:'Nominal',  disp:'Configurable TDP',   dispZh:'可配置TDP',      val:[E('Nominal'),E('Maximum')], menu:'./Processor', sc:'京东', rb:true },
        { name:'SR_IOV_Support',           type:'Enumeration', def:'Disabled', disp:'SR-IOV',              dispZh:'SR-IOV',         val:[E('Enabled'),E('Disabled')], menu:'./Processor', rb:true },
        // Ice Lake specific
        { name:'SpeedStep_PState',         type:'Enumeration', def:'Enabled',  disp:'SpeedStep (P-State)',dispZh:'SpeedStep',       help:'Ice Lake EIST power management.', val:[E('Enabled'),E('Disabled')], menu:'./Processor' },
        { name:'IntelSpeedSelect',         type:'Enumeration', def:'Disabled', disp:'Speed Select (SST)',  dispZh:'Speed Select',   help:'Intel SST for configurable base frequency.', val:[E('Enabled'),E('Disabled')], menu:'./Processor', rb:true },

        // Memory (DDR4 on Ice Lake)
        { name:'TotalMemSize',    type:'String', def:'512 GB',disp:'Total Memory',   dispZh:'总内存',     menu:'./Memory', ro:true },
        { name:'MemSpeed',        type:'Enumeration', def:'Auto',disp:'Memory Speed', dispZh:'内存速率',   help:'DDR4 speed on Ice Lake platform.', val:[E('Auto'),E('3200'),E('2933'),E('2666'),E('2400')], menu:'./Memory', rb:true },
        { name:'MemVoltage',      type:'Enumeration', def:'Auto',disp:'Memory Voltage',dispZh:'内存电压',  help:'DDR4 DIMM voltage options.', val:[E('Auto'),E('1.2V'),E('1.35V')], menu:'./Memory' },
        { name:'MemPatrolScrub',  type:'Enumeration', def:'Enabled',disp:'Patrol Scrub',dispZh:'内存巡检', val:[E('Enabled'),E('Disabled')], menu:'./Memory' },
        { name:'MemNumaMode',     type:'Enumeration', def:'Enabled',disp:'NUMA',        dispZh:'NUMA 优化', val:[E('Enabled'),E('Disabled')], menu:'./Memory', rb:true },
        { name:'MemMirrorMode',   type:'Enumeration', def:'Disabled',disp:'Mirror Mode', dispZh:'内存镜像',  val:[E('Disabled'),E('Enabled'),E('Spare')], menu:'./Memory', rb:true },
        { name:'MemRASMode',      type:'Enumeration', def:'MaxPerf',disp:'Memory RAS',   dispZh:'内存RAS',   val:[EN('MaxPerf','Max Performance'),EN('MaxRel','Max Reliability'),EN('ADDDC','ADDDC')], menu:'./Memory', rb:true },
        { name:'DcpmmTotalCapacity',type:'String',   def:'0 GB',   disp:'PMem Total',   dispZh:'傲腾总量',   help:'Optane PMem 200 series on Ice Lake.', menu:'./Memory', ro:true, sc:'京东' },
        { name:'DcpmmAppDirectMode',type:'Enumeration',def:'Disabled',disp:'PMem AppDirect',dispZh:'PMem直通', val:[E('Enabled'),E('Disabled')], menu:'./Memory', sc:'京东', rb:true },

        // Storage
        { name:'SataController',   type:'Enumeration', def:'Enabled', disp:'SATA Controller',   dispZh:'SATA 控制器', val:[E('Enabled'),E('Disabled')], menu:'./Storage', rb:true },
        { name:'SataMode',         type:'Enumeration', def:'AHCI',    disp:'SATA Mode',         dispZh:'SATA 模式',   val:[E('AHCI'),E('RAID'),E('Legacy')], menu:'./Storage', rb:true },
        { name:'SataHotplugCap',   type:'Enumeration', def:'Enabled', disp:'SATA Hot Plug',     dispZh:'SATA 热插拔', val:[E('Enabled'),E('Disabled')], menu:'./Storage' },
        { name:'SataPorts_0_3',    type:'Enumeration', def:'Enabled', disp:'SATA 0-3',          dispZh:'SATA 0-3',    val:[E('Enabled'),E('Disabled')], menu:'./Storage' },
        { name:'SataPorts_4_7',    type:'Enumeration', def:'Enabled', disp:'SATA 4-7',          dispZh:'SATA 4-7',    val:[E('Enabled'),E('Disabled')], menu:'./Storage' },
        { name:'NvmeRaidMode',     type:'Enumeration', def:'Disabled',disp:'VROC NVMe RAID',    dispZh:'VROC RAID',   help:'Intel VROC on Ice Lake.', val:[E('Enabled'),E('Disabled')], menu:'./Storage', sc:'京东', rb:true },
        { name:'OnboardRaidCtrl',  type:'Enumeration', def:'Enabled', disp:'Onboard RAID',      dispZh:'板载RAID',    help:'LSI 9460 on Ice Lake.', val:[E('Enabled'),E('Disabled')], menu:'./Storage', sc:'京东', rb:true },

        // Network
        { name:'NicPXEStack',   type:'Enumeration', def:'Enabled',disp:'UEFI PXE Stack', dispZh:'PXE 协议栈', val:[E('Enabled'),E('Disabled')], menu:'./Network' },
        { name:'NicHTTPBoot',   type:'Enumeration', def:'Disabled',disp:'HTTP Boot',     dispZh:'HTTP 启动',  val:[E('Enabled'),E('Disabled')], menu:'./Network' },
        { name:'NicIPv4PXE',    type:'Enumeration', def:'Enabled',disp:'IPv4 PXE',       dispZh:'IPv4 PXE',   val:[E('Enabled'),E('Disabled')], menu:'./Network' },
        { name:'NicIPv6PXE',    type:'Enumeration', def:'Disabled',disp:'IPv6 PXE',      dispZh:'IPv6 PXE',   val:[E('Enabled'),E('Disabled')], menu:'./Network' },
        { name:'NicVlanSupport',type:'Enumeration', def:'Disabled',disp:'VLAN',          dispZh:'VLAN 标记',  val:[E('Enabled'),E('Disabled')], menu:'./Network' },
        { name:'NicBootMode',   type:'Enumeration', def:'UEFI',   disp:'NIC Boot Mode',  dispZh:'网卡启动',   val:[E('UEFI'),E('Legacy PXE')], menu:'./Network', rb:true },
        { name:'IscsiBootSupport',type:'Enumeration',def:'Disabled',disp:'iSCSI Boot',   dispZh:'iSCSI 启动', val:[E('Enabled'),E('Disabled')], menu:'./Network', rb:true },

        // Boot
        { name:'BootMode',      type:'Enumeration', def:'Uefi',    disp:'Boot Mode',       dispZh:'启动模式',     val:[EN('Uefi','UEFI'),EN('LegacyBios','Legacy BIOS')], menu:'./Boot', rb:true },
        { name:'FastBoot',      type:'Enumeration', def:'Enabled', disp:'Fast Boot',       dispZh:'快速启动',     val:[E('Enabled'),E('Disabled')], menu:'./Boot' },
        { name:'QuietBoot',     type:'Enumeration', def:'Enabled', disp:'Quiet Boot',      dispZh:'安静启动',     val:[E('Enabled'),E('Disabled')], menu:'./Boot' },
        { name:'BootTimeout',   type:'Integer',     def:5,        disp:'Boot Timeout (s)', dispZh:'启动超时(秒)', lb:1, ub:65535, st:1, menu:'./Boot' },
        { name:'BootRetryCount',type:'Integer',     def:3,        disp:'Boot Retry Count', dispZh:'重试次数',     lb:0, ub:10, st:1, menu:'./Boot' },

        // Security
        { name:'SecureBoot',         type:'Enumeration', def:'Disabled',disp:'Secure Boot',      dispZh:'安全启动',    val:[E('Enabled'),E('Disabled')], ro:true, menu:'./Security', rb:true },
        { name:'SecureBootMode',     type:'Enumeration', def:'Standard',disp:'Secure Boot Mode', dispZh:'安全启动模式',val:[E('Standard'),E('Custom')], menu:'./Security', rb:true },
        { name:'TpmState',           type:'Enumeration', def:'Enabled', disp:'TPM 2.0 State',    dispZh:'TPM 状态',    val:[E('Enabled'),E('Disabled')], menu:'./Security', rb:true },
        { name:'TpmActivePcrBanks',  type:'Enumeration', def:'SHA256',  disp:'TPM PCR Banks',    dispZh:'PCR 存储区',  val:[E('SHA1'),E('SHA256')], menu:'./Security', rb:true },
        { name:'TpmClear',           type:'Enumeration', def:'No',      disp:'Clear TPM',        dispZh:'清除TPM',     val:[E('No'),EN('YesReset','Yes, Next Reset')], menu:'./Security', rb:true },
        { name:'AdminPassword',      type:'Password',    def:null,      disp:'Admin Password',   dispZh:'管理员密码',  mn:8, mx:32, menu:'./Security' },
        { name:'UserPassword',       type:'Password',    def:null,      disp:'User Password',    dispZh:'用户密码',    mn:8, mx:32, menu:'./Security' },
        { name:'ChassisIntrusion',   type:'Enumeration', def:'Disabled',disp:'Chassis Intrusion',dispZh:'机箱入侵',    val:[E('Enabled'),E('Disabled')], menu:'./Security' },

        // Power
        { name:'PowerPolicy',          type:'Enumeration', def:'Efficient',disp:'Power Policy',    dispZh:'电源策略',   val:[EN('Perf','Max Performance'),EN('Efficient','Efficient'),EN('Save','Power Saving')], menu:'./Power', rb:true },
        { name:'AcPowerRestorePolicy', type:'Enumeration', def:'LastState',disp:'AC Restore',      dispZh:'交流电恢复', val:[EN('Off','Always Off'),EN('On','Always On'),EN('LastState','Last State')], menu:'./Power' },
        { name:'PowerOnByLAN',         type:'Enumeration', def:'Enabled', disp:'Wake-on-LAN',     dispZh:'网络唤醒',    val:[E('Enabled'),E('Disabled')], menu:'./Power' },
        { name:'PowerOnDelay',         type:'Integer',     def:0,        disp:'Power-On Delay',   dispZh:'开机延迟',   lb:0, ub:600, st:5, menu:'./Power' },
        { name:'FanControlMode',       type:'Enumeration', def:'Auto',    disp:'Fan Control',     dispZh:'风扇控制',   val:[E('Auto'),E('Manual')], menu:'./Power' },
        { name:'FanSpeedLowLimit',     type:'Integer',     def:20,       disp:'Fan Min (%)',      dispZh:'风扇最低',   lb:5, ub:100, st:5, menu:'./Power' },
        { name:'PowerCapEnable',       type:'Enumeration', def:'Disabled',disp:'Power Capping',   dispZh:'功率封顶',   val:[E('Enabled'),E('Disabled')], sc:'京东', menu:'./Power' },
        { name:'PowerCapValue',        type:'Integer',     def:600,      disp:'Power Cap (W)',    dispZh:'功率封顶(瓦)',lb:100, ub:2000, st:10, sc:'京东', menu:'./Power' },
        { name:'RtcWakeup',            type:'Enumeration', def:'Disabled',disp:'RTC Wakeup',      dispZh:'RTC 定时',   val:[E('Enabled'),E('Disabled')], menu:'./Power' },

        // Advanced (Ice Lake: PCIe 4.0, fewer Gen5 features)
        { name:'HardwarePrefetcher',    type:'Enumeration', def:'Enabled',  disp:'Hardware Prefetcher',dispZh:'硬件预取器',  val:[E('Enabled'),E('Disabled')], menu:'./Advanced', rb:true },
        { name:'AdjacentCachePrefetch', type:'Enumeration', def:'Enabled',  disp:'Adjacent Prefetch',  dispZh:'邻接预取',    val:[E('Enabled'),E('Disabled')], menu:'./Advanced', rb:true },
        { name:'DCUStreamPrefetcher',   type:'Enumeration', def:'Enabled',  disp:'DCU Stream Pre',     dispZh:'DCU 流预取',  val:[E('Enabled'),E('Disabled')], menu:'./Advanced', rb:true },
        { name:'DCUIPPrefetcher',       type:'Enumeration', def:'Enabled',  disp:'DCU IP Pre',         dispZh:'DCU IP 预取', val:[E('Enabled'),E('Disabled')], menu:'./Advanced', rb:true },
        { name:'AESNI',                 type:'Enumeration', def:'Enabled',  disp:'Intel AES-NI',       dispZh:'AES-NI',       val:[E('Enabled'),E('Disabled')], menu:'./Advanced', rb:true },
        { name:'IntelSGX',              type:'Enumeration', def:'Disabled', disp:'Intel SGX',          dispZh:'SGX',          val:[E('Enabled'),E('Disabled')], menu:'./Advanced', rb:true },
        { name:'Above4GDecoding',   type:'Enumeration', def:'Enabled',  disp:'Above 4G Decoding', dispZh:'4G以上解码',   val:[E('Enabled'),E('Disabled')], menu:'./Advanced', rb:true },
        { name:'ResizableBAR',      type:'Enumeration', def:'Enabled',  disp:'Re-Size BAR',       dispZh:'可调整BAR',    val:[E('Enabled'),E('Disabled')], menu:'./Advanced', rb:true },
        { name:'PcieMaxLinkSpeed',  type:'Enumeration', def:'Auto',     disp:'PCIe Max Speed',    dispZh:'PCIe 速率',    help:'PCIe 4.0 max on Ice Lake.', val:[E('Auto'),E('Gen1'),E('Gen2'),E('Gen3'),E('Gen4')], menu:'./Advanced', rb:true },
        { name:'PcieAspmSupport',   type:'Enumeration', def:'Auto',     disp:'PCIe ASPM',         dispZh:'PCIe ASPM',    val:[E('Auto'),E('Enabled'),E('Disabled')], menu:'./Advanced' },
        { name:'Pcie10BitTag',      type:'Enumeration', def:'Enabled',  disp:'PCIe 10-bit Tag',   dispZh:'10位标签',     val:[E('Enabled'),E('Disabled')], menu:'./Advanced', rb:true },
        { name:'UsbPortsAll',       type:'Enumeration', def:'Enabled',  disp:'All USB Ports',     dispZh:'所有USB',      val:[E('Enabled'),E('Disabled')], menu:'./Advanced', rb:true },
        { name:'UsbFrontPorts',     type:'Enumeration', def:'Enabled',  disp:'Front USB',         dispZh:'前置USB',      val:[E('Enabled'),E('Disabled')], menu:'./Advanced' },
        { name:'UsbRearPorts',      type:'Enumeration', def:'Enabled',  disp:'Rear USB',          dispZh:'后置USB',      val:[E('Enabled'),E('Disabled')], menu:'./Advanced' },
        { name:'UsbBootSupport',    type:'Enumeration', def:'Enabled',  disp:'USB Boot',           dispZh:'USB 启动',     val:[E('Enabled'),E('Disabled')], menu:'./Advanced' },
        { name:'VGA_Primary',       type:'Enumeration', def:'Auto',     disp:'Primary Video',     dispZh:'主显示适配器', val:[E('Auto'),EN('Onboard','Onboard VGA'),EN('PCIe','PCIe VGA')], menu:'./Advanced', rb:true },
        { name:'SerialAEnabled',    type:'Enumeration', def:'Enabled',  disp:'Serial COM1',       dispZh:'串口 COM1',    val:[E('Enabled'),E('Disabled')], menu:'./Advanced', rb:true },
        { name:'SerialBEnabled',    type:'Enumeration', def:'Disabled', disp:'Serial COM2',       dispZh:'串口 COM2',    val:[E('Enabled'),E('Disabled')], menu:'./Advanced', rb:true },
        { name:'SerialBaudRate',    type:'Enumeration', def:'115200',   disp:'Serial Baud',       dispZh:'波特率',       val:[E('9600'),E('19200'),E('38400'),E('57600'),E('115200')], menu:'./Advanced' },
        { name:'ConsoleRedirect',   type:'Enumeration', def:'Enabled',  disp:'Console Redir',     dispZh:'控制台重定向', val:[E('Enabled'),E('Disabled')], menu:'./Advanced' },
        { name:'PerfProfile',       type:'Enumeration', def:'Efficient',disp:'Perf Profile',      dispZh:'性能配置档',   val:[EN('MaxPerf','Max'),EN('Efficient','Efficient')], menu:'./Advanced', rb:true },
        { name:'EnergyEfficientTurbo',type:'Enumeration',def:'Enabled', disp:'Energy Eff Turbo',   dispZh:'节能Turbo',    val:[E('Enabled'),E('Disabled')], menu:'./Advanced' },
        { name:'SubNumaClustering',    type:'Enumeration',def:'Disabled',disp:'SNC',                dispZh:'子NUMA集群',   val:[E('Enabled'),E('Disabled')], menu:'./Advanced', rb:true },

        // Server Mgmt
        { name:'BmcWatchdog',          type:'Enumeration', def:'Enabled',  disp:'BMC Watchdog',     dispZh:'BMC 看门狗',  val:[E('Enabled'),E('Disabled')], menu:'./ServerMgmt' },
        { name:'BmcWatchdogTimeout',   type:'Integer',     def:300,        disp:'Watchdog Timeout', dispZh:'超时(秒)',    lb:30, ub:1800, st:30, menu:'./ServerMgmt' },
        { name:'OsWatchdogTimer',      type:'Enumeration', def:'Enabled',  disp:'OS Watchdog',      dispZh:'OS 看门狗',   val:[E('Enabled'),E('Disabled')], menu:'./ServerMgmt' },
        { name:'SolEnabled',           type:'Enumeration', def:'Enabled',  disp:'Serial Over LAN',  dispZh:'SOL',         val:[E('Enabled'),E('Disabled')], menu:'./ServerMgmt' },
        { name:'BmcLanMode',           type:'Enumeration', def:'Dedicated',disp:'BMC LAN Mode',     dispZh:'BMC 网口',    val:[E('Dedicated'),EN('SharedLOM','Shared LOM')], sc:'京东', menu:'./ServerMgmt' },
        { name:'ErpLot6PowerMode',     type:'Enumeration', def:'Disabled', disp:'ERP Lot 6',        dispZh:'ERP 节能',    val:[E('Enabled'),E('Disabled')], menu:'./ServerMgmt' },
        { name:'SysMaintenanceSwitch', type:'Enumeration', def:'Disabled', disp:'Maint Switch',     dispZh:'维护模式',    val:[E('Enabled'),E('Disabled')], menu:'./ServerMgmt' },
        { name:'BmcIPv4Address',       type:'String',      def:'192.168.2.50',disp:'BMC IPv4',     dispZh:'BMC IPv4',    ro:true, menu:'./ServerMgmt' },
        { name:'BmcMacAddress',        type:'String',      def:'00:1B:2C:3D:4E:50',disp:'BMC MAC', dispZh:'BMC MAC',     ro:true, menu:'./ServerMgmt' },

        // Misc
        { name:'NumLock',             type:'Enumeration', def:'On',      disp:'NumLock',             dispZh:'NumLock',       val:[E('On'),E('Off')], menu:'./Misc' },
        { name:'CpuErrLog',           type:'Enumeration', def:'Enabled', disp:'CPU Error Log',        dispZh:'CPU 错误日志',  val:[E('Enabled'),E('Disabled')], menu:'./Misc' },
        { name:'MemErrLog',           type:'Enumeration', def:'Enabled', disp:'Mem Error Log',        dispZh:'内存错误日志',  val:[E('Enabled'),E('Disabled')], menu:'./Misc' },
        { name:'PcieErrLog',          type:'Enumeration', def:'Enabled', disp:'PCIe Error Log',       dispZh:'PCIe 错误日志', val:[E('Enabled'),E('Disabled')], menu:'./Misc' },
        { name:'WheaSupport',         type:'Enumeration', def:'Enabled', disp:'WHEA Support',         dispZh:'WHEA',          val:[E('Enabled'),E('Disabled')], menu:'./Misc' },
        { name:'PxeIpVersion',        type:'Enumeration', def:'IPv4',    disp:'PXE IP Version',      dispZh:'PXE IP 版本',   val:[E('IPv4'),E('IPv6')], menu:'./Misc' },
    ]
};

/* ================================================================
 * 所有机型定义 & 工厂函数
 * ================================================================ */
const ALL_MODELS = [MODEL_2288HV7, MODEL_1288HV7, MODEL_5288V7, MODEL_2488HV7, MODEL_2288HV6];

function buildModelProfile(model) {
    const profile = createSystemProfile(model.productName, model.systemId, model.firmwareVersion);
    buildMenus(profile);
    buildAttrs(profile, model.attrs);
    buildDeps(profile);
    return profile;
}

function buildAllDemoProfiles() {
    return ALL_MODELS.map(buildModelProfile);
}

// 兼容旧接口 (FUSION_DEMO 仍指向 2288H V7)
const FUSION_DEMO = {
    productName: MODEL_2288HV7.productName,
    systemId: MODEL_2288HV7.systemId,
    firmwareVersion: MODEL_2288HV7.firmwareVersion,
    buildMenus(profile) { buildMenus(profile); },
    buildAttributes(profile) { buildAttrs(profile, MODEL_2288HV7.attrs); },
    buildDependencies(profile) { buildDeps(profile); }
};

// Rebuild demo-data.js: 304 attrs RS2600G6, all with help, single file
const fs = require('fs');
const path = require('path');
const f = path.join(__dirname, '..', 'js', 'demo-data.js');
let code = fs.readFileSync(f, 'utf8');
const headerEnd = code.indexOf('const DEMO_MODEL');
const header = code.substring(0, headerEnd);
let out = header + '\n// ============ 机型定义 (304 个 BIOS 选项，全部含英文帮助) ============\n';
out += "const E=(v)=>({valueName:v,valueDisplayName:v});const EN=(v,d)=>({valueName:v,valueDisplayName:d});\n";
out += "const MENUS=[";
out += "{MenuName:'Main',DisplayName:'Main',displayNameZh:'主页信息',DisplayOrder:1,MenuPath:'./Main'},";
out += "{MenuName:'Boot',DisplayName:'Boot',displayNameZh:'启动配置',DisplayOrder:3,MenuPath:'./BootOptions'},";
out += "{MenuName:'Security',DisplayName:'Security',displayNameZh:'安全配置',DisplayOrder:4,MenuPath:'./Security'},";
out += "{MenuName:'SvrMgmt',DisplayName:'Server Mgmt',displayNameZh:'服务器管理',DisplayOrder:5,MenuPath:'./ServerManagement'},";
out += "{MenuName:'Processor',DisplayName:'Processor Config',displayNameZh:'处理器配置',DisplayOrder:10,MenuPath:'./Advanced/ProcessorOptions'},";
out += "{MenuName:'Memory',DisplayName:'Memory Config',displayNameZh:'内存配置',DisplayOrder:20,MenuPath:'./Advanced/MemoryConfig'},";
out += "{MenuName:'Storage',DisplayName:'Storage Config',displayNameZh:'存储配置',DisplayOrder:30,MenuPath:'./Advanced/StorageConfig'},";
out += "{MenuName:'Network',DisplayName:'Network Stack',displayNameZh:'网络配置',DisplayOrder:40,MenuPath:'./Advanced/NetworkStack'},";
out += "{MenuName:'Power',DisplayName:'Power & Perf',displayNameZh:'电源与性能',DisplayOrder:50,MenuPath:'./Advanced/PowerMgmt'},";
out += "{MenuName:'PCIe',DisplayName:'PCIe Config',displayNameZh:'PCIe配置',DisplayOrder:60,MenuPath:'./Advanced/PCIeConfig'},";
out += "{MenuName:'USB',DisplayName:'USB Config',displayNameZh:'USB配置',DisplayOrder:70,MenuPath:'./Advanced/USBConfig'},";
out += "{MenuName:'Serial',DisplayName:'Serial Config',displayNameZh:'串口配置',DisplayOrder:80,MenuPath:'./Advanced/SerialConfig'},";
out += "{MenuName:'RAS',DisplayName:'RAS Config',displayNameZh:'RAS配置',DisplayOrder:90,MenuPath:'./Advanced/RASConfig'},";
out += "{MenuName:'Misc',DisplayName:'Miscellaneous',displayNameZh:'其他高级',DisplayOrder:99,MenuPath:'./Advanced/MiscConfig'},";
out += "{MenuName:'Prefetch',DisplayName:'Prefetcher',displayNameZh:'预取器',DisplayOrder:11,MenuPath:'./Advanced/ProcessorOptions/PrefetcherConfig'},";
out += "{MenuName:'Cores',DisplayName:'Core Config',displayNameZh:'核心配置',DisplayOrder:12,MenuPath:'./Advanced/ProcessorOptions/CoreConfig'},";
out += "{MenuName:'UPI',DisplayName:'UPI Config',displayNameZh:'UPI链路',DisplayOrder:13,MenuPath:'./Advanced/ProcessorOptions/UPIConfig'},";
out += "{MenuName:'MemRAS',DisplayName:'Memory RAS',displayNameZh:'内存RAS',DisplayOrder:21,MenuPath:'./Advanced/MemoryConfig/MemoryRAS'},";
out += "{MenuName:'MemTiming',DisplayName:'Memory Timing',displayNameZh:'内存时序',DisplayOrder:22,MenuPath:'./Advanced/MemoryConfig/MemoryTiming'},";
out += "{MenuName:'CPU_Pwr',DisplayName:'CPU Power',displayNameZh:'CPU功耗',DisplayOrder:51,MenuPath:'./Advanced/PowerMgmt/CPU_Power'},";
out += "{MenuName:'Thermal',DisplayName:'Thermal Mgmt',displayNameZh:'散热管理',DisplayOrder:52,MenuPath:'./Advanced/PowerMgmt/ThermalMgmt'},";
out += "{MenuName:'UEFI_Net',DisplayName:'UEFI Network',displayNameZh:'UEFI网络',DisplayOrder:41,MenuPath:'./Advanced/NetworkStack/UEFI_Network'},";
out += "{MenuName:'iSCSI_Cfg',DisplayName:'iSCSI Config',displayNameZh:'iSCSI配置',DisplayOrder:42,MenuPath:'./Advanced/NetworkStack/iSCSI_Config'},";
out += "{MenuName:'TPM_Cfg',DisplayName:'TPM Config',displayNameZh:'TPM配置',DisplayOrder:1,MenuPath:'./Security/TPM_Config'},";
out += "{MenuName:'SB_Cfg',DisplayName:'Secure Boot',displayNameZh:'安全启动',DisplayOrder:2,MenuPath:'./Security/SecureBootConfig'},";
out += "{MenuName:'BootOrd',DisplayName:'Boot Device',displayNameZh:'启动设备',DisplayOrder:1,MenuPath:'./BootOptions/BootDeviceOrder'},";
out += "{MenuName:'BootPol',DisplayName:'Boot Policy',displayNameZh:'启动策略',DisplayOrder:2,MenuPath:'./BootOptions/BootPolicy'},";
out += "{MenuName:'BMC_Net',DisplayName:'BMC Network',displayNameZh:'BMC网络',DisplayOrder:1,MenuPath:'./ServerManagement/BMC_Network'},";
out += "{MenuName:'EventLog',DisplayName:'Event Log',displayNameZh:'事件日志',DisplayOrder:2,MenuPath:'./ServerManagement/EventLog'},";
out += "{MenuName:'PkgCState',DisplayName:'Package C-State',displayNameZh:'封装C状态',DisplayOrder:1,MenuPath:'./Advanced/PowerMgmt/CPU_Power/PackageCState'},";
out += "{MenuName:'PerCore',DisplayName:'Per Core',displayNameZh:'按核配置',DisplayOrder:1,MenuPath:'./Advanced/ProcessorOptions/CoreConfig/PerCore'},";
out += "{MenuName:'CoreLimit',DisplayName:'Core State Limit',displayNameZh:'状态限制',DisplayOrder:1,MenuPath:'./Advanced/ProcessorOptions/CoreConfig/PerCore/CoreStateLimit'},";
out += "{MenuName:'Graphics',DisplayName:'Graphics',displayNameZh:'显卡配置',DisplayOrder:100,MenuPath:'./Advanced/GraphicsConfig'},";
out += "{MenuName:'SMI_Cfg',DisplayName:'SMI Config',displayNameZh:'SMI配置',DisplayOrder:110,MenuPath:'./Advanced/SMIConfig'},";
out += "{MenuName:'SGX_Cfg',DisplayName:'Intel SGX',displayNameZh:'SGX',DisplayOrder:3,MenuPath:'./Security/IntelSGX'},";
out += "{MenuName:'TXT_Cfg',DisplayName:'Intel TXT',displayNameZh:'TXT',DisplayOrder:4,MenuPath:'./Security/IntelTXT'},";
out += "{MenuName:'TME_Cfg',DisplayName:'Intel TME',displayNameZh:'TME',DisplayOrder:5,MenuPath:'./Security/IntelTME'},";
out += "{MenuName:'UPI_Pwr',DisplayName:'UPI Power',displayNameZh:'UPI功耗',DisplayOrder:2,MenuPath:'./Advanced/PowerMgmt/CPU_Power/UPI_Power'},";
out += "{MenuName:'Interleave',DisplayName:'Interleave',displayNameZh:'内存交织',DisplayOrder:23,MenuPath:'./Advanced/MemoryConfig/MemoryInterleave'},";
out += "{MenuName:'Sparing',DisplayName:'Sparing',displayNameZh:'内存备用',DisplayOrder:24,MenuPath:'./Advanced/MemoryConfig/MemorySparing'},";
out += "{MenuName:'HWPM_Cfg',DisplayName:'HWPM Advanced',displayNameZh:'HWPM高级',DisplayOrder:3,MenuPath:'./Advanced/PowerMgmt/CPU_Power/PState_HWPM'},";
out += "{MenuName:'RAS_Mem',DisplayName:'Mem RAS Detail',displayNameZh:'RAS详情',DisplayOrder:1,MenuPath:'./Advanced/RASConfig/MemRAS'},";
out += "{MenuName:'PMem_Cfg',DisplayName:'Optane PMem',displayNameZh:'傲腾PMem',DisplayOrder:40,MenuPath:'./Advanced/StorageConfig/OptanePMem'},";
out += "{MenuName:'SysInfo',DisplayName:'System Info',displayNameZh:'系统信息',DisplayOrder:3,MenuPath:'./ServerManagement/SystemInfo'},";
out += "{MenuName:'PwrRestore',DisplayName:'Power Restore',displayNameZh:'电源恢复',DisplayOrder:4,MenuPath:'./ServerManagement/PowerRestore'},";
out += "{MenuName:'Slots',DisplayName:'Per-Slot',displayNameZh:'按槽位',DisplayOrder:1,MenuPath:'./Advanced/PCIeConfig/PerSlot'},";
out += "{MenuName:'USB_Mass',DisplayName:'USB Mass Storage',displayNameZh:'USB存储',DisplayOrder:1,MenuPath:'./Advanced/USBConfig/USB_MassStorage'},";
out += "{MenuName:'IMON_Cfg',DisplayName:'IMON Config',displayNameZh:'IMON',DisplayOrder:4,MenuPath:'./Advanced/PowerMgmt/CPU_Power/IMON_Config'},";
out += "{MenuName:'TrustExe',DisplayName:'Trusted Exec',displayNameZh:'可信执行',DisplayOrder:1,MenuPath:'./Advanced/MiscConfig/TrustedExecution'},";
out += "{MenuName:'RAS_Adv',DisplayName:'RAS Advanced',displayNameZh:'RAS高级',DisplayOrder:1,MenuPath:'./Advanced/ProcessorOptions/RAS_Advanced'},";
out += "{MenuName:'BBS_Cfg',DisplayName:'BBS Priority',displayNameZh:'BBS优先级',DisplayOrder:3,MenuPath:'./BootOptions/BBS_Priority'},";
out += "{MenuName:'EraseCfg',DisplayName:'Secure Erase',displayNameZh:'安全擦除',DisplayOrder:6,MenuPath:'./Security/SecureErase'},";
out += "{MenuName:'LDAP_Cfg',DisplayName:'LDAP Config',displayNameZh:'LDAP配置',DisplayOrder:7,MenuPath:'./Security/LDAP_Config'},";
out += "];\n\n";
out += "const DEMO_MODEL = {\n    productName: 'RackServer RS2600 G6',\n    systemId: 'RS2600G6',\n";
out += "    firmwareVersion: 'BMC v2.2.0',\n    attrs: [\n";

// Help: concise all attrs with programmatic descriptions  
const A = (n,t,d,disp,dzh,m,help,val,o) => {
    let s=`        { name:'${n}',type:'${t}',def:${JSON.stringify(d)},disp:'${disp}',dispZh:'${dzh||''}',`;
    s+=`help:'${(help||'').replace(/'/g,"\\'")}',menu:'${m}'`;
    if(val && val.length) s+=`,val:[${val.map(v=>typeof v==='string'?`E('${v}')`:v[0]==='EN'?`EN('${v[1]}','${v[2]}')`:`E('${v}')`).join(',')}]`;
    if(o){
        if(o.ro) s+=',ro:true'; if(o.rb) s+=',rb:true'; if(o.sr===false) s+=',sr:false';
        if(o.sc) s+=`,sc:'${o.sc}'`; if(o.lb!==undefined) s+=`,lb:${o.lb}`; if(o.ub!==undefined) s+=`,ub:${o.ub}`;
        if(o.st!==undefined) s+=`,st:${o.st}`; if(o.mn!==undefined) s+=`,mn:${o.mn}`; if(o.mx!==undefined) s+=`,mx:${o.mx}`;
    }
    return s+' }';
};

const attrs = [];
const add = (...a) => attrs.push(a);
// H = help text, V = values, O = options

// === Main (8) ===
add('SystemUUID','String','00000000-0000-0000-0000-000000000000','System UUID','系统UUID','./Main','Unique 128-bit identifier for this system instance used by management software.',[],{ro:1,sr:false});
add('BIOSVersion','String','RS26G6.02.00.002','BIOS Version','BIOS版本','./Main','Current BIOS firmware version string.',[],{ro:1});
add('BMCVersion','String','v2.2.0','BMC Version','BMC版本','./Main','Current BMC firmware version.',[],{ro:1});
add('CPLDVersion','String','v1.04','CPLD Version','CPLD版本','./Main','Current CPLD firmware version.',[],{ro:1});
add('PlatformName','String','RS2600G6','Platform Name','平台名称','./Main','Hardware platform identifier for OS and driver optimizations.',[],{ro:1});
add('MemoryTotalSize','String','0 GB','Total Memory','内存总量','./Main','Total physical memory detected during POST from SPD data.',[],{ro:1});
add('CPUModel','String','Intel Xeon Gold 64xx','CPU Model','CPU型号','./Main','Processor model string reported by CPUID instruction.',[],{ro:1});
add('AssetTag','String','','Asset Tag','资产标签','./Main','User-defined string for asset tracking and inventory management.',[]);

// === ProcessorOptions (10) ===
add('HyperThreading','Enumeration','Enabled','Hyper-Threading','超线程技术','./Advanced/ProcessorOptions','Intel Hyper-Threading Technology. Each physical core appears as two logical processors.',['Enabled','Disabled'],{rb:1});
add('VTxSupport','Enumeration','Enabled','Intel VT-x','Intel VT-x','./Advanced/ProcessorOptions','Intel VT-x for hardware-assisted CPU virtualization. Required for VMware, KVM, Hyper-V.',['Enabled','Disabled'],{rb:1});
add('VtdSupport','Enumeration','Enabled','Intel VT-d','Intel VT-d','./Advanced/ProcessorOptions','Intel VT-d for DMA remapping and interrupt remapping. Required for PCIe device passthrough.',['Enabled','Disabled'],{rb:1});
add('SMX','Enumeration','Enabled','SMX','SMX安全扩展','./Advanced/ProcessorOptions','Safer Mode Extensions for measured launch. Required for Intel TXT.',['Enabled','Disabled'],{rb:1});
add('TurboMode','Enumeration','Enabled','Turbo Mode','睿频加速','./Advanced/ProcessorOptions','Intel Turbo Boost dynamically increases CPU frequency within thermal and power limits.',['Enabled','Disabled']);
add('CStateControl','Enumeration','Enabled','Processor C-States','C状态控制','./Advanced/ProcessorOptions','Enable processor C-States for power saving. Disabled limits to C0/C1 only.',['Enabled','Disabled']);
add('C1EAuto','Enumeration','Enabled','C1E Auto','C1E自动','./Advanced/ProcessorOptions','Auto-transition to enhanced C1E halt state when all cores idle.',['Enabled','Disabled']);
add('MonitorMWAIT','Enumeration','Enabled','Monitor/MWAIT','Monitor/MWAIT','./Advanced/ProcessorOptions','Enable MONITOR/MWAIT for OS-level idle power management.',['Enabled','Disabled']);
add('MachineCheck','Enumeration','Enabled','Machine Check','机器检查','./Advanced/ProcessorOptions','Enable Machine Check Architecture for hardware error detection.',['Enabled','Disabled']);
add('ACPI_L3_Latency','Integer',48,'ACPI L3 Latency (ns)','ACPI L3延迟','./Advanced/ProcessorOptions','Report L3 cache latency to ACPI tables for OS scheduling.',[],{lb:0,ub:255,st:1});

// === PrefetcherConfig (8) ===
add('MLCStreamPrefetch','Enumeration','Enabled','MLC Stream Prefetch','MLC流预取','./Advanced/ProcessorOptions/PrefetcherConfig','MLC stream prefetcher for sequential data streams in mid-level cache.',['Enabled','Disabled']);
add('MLCSpatialPrefetch','Enumeration','Enabled','MLC Spatial Prefetch','MLC空间预取','./Advanced/ProcessorOptions/PrefetcherConfig','MLC spatial prefetcher for adjacent cache lines in same page.',['Enabled','Disabled']);
add('DCUStreamPrefetch','Enumeration','Enabled','DCU Stream Prefetch','DCU流预取','./Advanced/ProcessorOptions/PrefetcherConfig','DCU stream prefetcher detects sequential patterns for L1 data cache.',['Enabled','Disabled']);
add('DCUIPPrefetch','Enumeration','Enabled','DCU IP Prefetch','DCU IP预取','./Advanced/ProcessorOptions/PrefetcherConfig','DCU IP-based prefetcher using load history to predict future addresses.',['Enabled','Disabled']);
add('LLCPrefetch','Enumeration','Enabled','LLC Prefetch','LLC预取','./Advanced/ProcessorOptions/PrefetcherConfig','LLC prefetcher reduces off-chip latency via shared L3 cache.',['Enabled','Disabled']);
add('AdjacentCachePrefetch','Enumeration','Enabled','Adjacent Cache Prefetch','相邻缓存预取','./Advanced/ProcessorOptions/PrefetcherConfig','Prefetch adjacent cache lines into L2 for spatial locality workloads.',['Enabled','Disabled']);
add('XPT_Prefetch','Enumeration','Auto','XPT Prefetch','XPT预取','./Advanced/ProcessorOptions/PrefetcherConfig','Extended Prefetch Training. Auto adjusts aggressiveness dynamically.',['Auto','Enabled','Disabled']);
add('L2RFO_Prefetch','Enumeration','Enabled','L2 RFO Prefetch','L2 RFO预取','./Advanced/ProcessorOptions/PrefetcherConfig','L2 Read-For-Ownership prefetcher reduces coherence traffic for writes.',['Enabled','Disabled']);

// === CoreConfig (5) ===
add('ActiveCores','Enumeration','All','Active Cores','活动核心数','./Advanced/ProcessorOptions/CoreConfig','Number of active processor cores. Fewer cores reduce power, increase turbo.',['All','Half','Quarter']);
add('Enable_AES','Enumeration','Enabled','AES-NI','AES指令集','./Advanced/ProcessorOptions/CoreConfig','Intel AES-NI for hardware-accelerated encryption/decryption.',['Enabled','Disabled']);
add('Enable_AVX','Enumeration','Enabled','AVX Support','AVX支持','./Advanced/ProcessorOptions/CoreConfig','Intel AVX for 256-bit SIMD vector operations.',['Enabled','Disabled']);
add('AVX512_Enable','Enumeration','Enabled','AVX-512','AVX-512','./Advanced/ProcessorOptions/CoreConfig','Intel AVX-512 for 512-bit vector operations. Highest throughput for HPC/AI.',['Enabled','Disabled']);
add('LimitCPUID','Enumeration','Disabled','Limit CPUID Max','限制CPUID','./Advanced/ProcessorOptions/CoreConfig','Limit maximum CPUID value for legacy OS compatibility.',['Enabled','Disabled']);

// === PerCore (3) ===
add('PerCoreHT','Enumeration','Auto','Per Core HT','按核超线程','./Advanced/ProcessorOptions/CoreConfig/PerCore','Per-core Hyper-Threading control. Auto follows global setting.',['Auto','Enabled','Disabled']);
add('PerCorePState','Enumeration','Auto','Per Core P-State','按核P状态','./Advanced/ProcessorOptions/CoreConfig/PerCore','Per-core P-State frequency control for asymmetric configuration.',['Auto','Enabled','Disabled']);
add('PerCoreCState','Enumeration','Auto','Per Core C-State','按核C状态','./Advanced/ProcessorOptions/CoreConfig/PerCore','Per-core C-State power management for fine-grained idle control.',['Auto','Enabled','Disabled']);

// === CoreStateLimit L5 (2) ===
add('Core_C1E_Limit','Enumeration','C6','C1E State Limit','C1E限制','./Advanced/ProcessorOptions/CoreConfig/PerCore/CoreStateLimit','Maximum C-State for C1E transitions. NoLimit allows deepest states.',['C3','C6','C7','NoLimit']);
add('Core_C6_Limit','Enumeration','C6','C6 State Limit','C6限制','./Advanced/ProcessorOptions/CoreConfig/PerCore/CoreStateLimit','Maximum C-State for C6 packet transitions. Deeper states save more power.',['C3','C6','C7','NoLimit']);

// === UPIConfig (6) ===
add('UPILinkSpeed','Enumeration','Auto','UPI Link Speed','UPI速率','./Advanced/ProcessorOptions/UPIConfig','UPI link data rate in GT/s for multi-socket bandwidth.',['Auto','9.6 GT/s','10.4 GT/s','11.2 GT/s']);
add('UPILinkFreq','Enumeration','Auto','UPI Link Frequency','UPI频率','./Advanced/ProcessorOptions/UPIConfig','UPI link reference clock frequency in MHz.',['Auto','2400 MHz','2666 MHz','2933 MHz']);
add('UPIPrefetch','Enumeration','Enabled','UPI Prefetch','UPI预取','./Advanced/ProcessorOptions/UPIConfig','Speculative prefetch across UPI links from remote socket memory.',['Enabled','Disabled']);
add('UPI_DCA','Enumeration','Enabled','UPI DCA','UPI DCA','./Advanced/ProcessorOptions/UPIConfig','Direct Cache Access over UPI for I/O data placement in CPU cache.',['Enabled','Disabled']);
add('StaleAtoSOpt','Enumeration','Enabled','Stale A-to-S','陈旧AtoS','./Advanced/ProcessorOptions/UPIConfig','Stale A-to-S optimization for cache coherence snoop latency reduction.',['Enabled','Disabled']);
add('LLCDeadAlloc','Enumeration','Enabled','LLC Dead Line Alloc','LLC死线分配','./Advanced/ProcessorOptions/UPIConfig','LLC dead line allocation to prevent cache thrashing.',['Enabled','Disabled']);

// === RAS_Advanced (4) ===
add('FastString','Enumeration','Enabled','Fast String Ops','快速字符串','./Advanced/ProcessorOptions/RAS_Advanced','Enable REP MOVS/STOS fast string operations for memory copy.',['Enabled','Disabled']);
add('NoExecute_MemProtection','Enumeration','Enabled','XD Bit (NX)','XD位','./Advanced/ProcessorOptions/RAS_Advanced','XD/NX bit prevents code execution from data memory pages.',['Enabled','Disabled']);
add('SPP_Correction','Enumeration','Enabled','SPP Correction','SPP纠正','./Advanced/ProcessorOptions/RAS_Advanced','Soft Patch Panel for runtime processor errata corrections.',['Enabled','Disabled']);
add('PagePolicy','Enumeration','Adaptive','Page Policy','页面策略','./Advanced/ProcessorOptions/RAS_Advanced','Memory page policy. Adaptive balances Open/Closed based on access patterns.',['Adaptive','Closed','Open']);

// === MemoryConfig (7) ===
add('MemSpeed','Enumeration','Auto','Memory Speed','内存速率','./Advanced/MemoryConfig','Memory frequency in MT/s. Auto selects optimal based on DIMM SPD.',['Auto','4800 MT/s','4400 MT/s','4000 MT/s','3600 MT/s','3200 MT/s'],{rb:1});
add('NUMAOptimization','Enumeration','Enabled','NUMA Optimization','NUMA优化','./Advanced/MemoryConfig','Enable NUMA-aware memory topology for the operating system.',['Enabled','Disabled'],{rb:1});
add('SubNUMA_Cluster','Enumeration','Auto','Sub-NUMA Cluster','子NUMA集群','./Advanced/MemoryConfig','Split each socket into two NUMA domains for local memory latency.',['Auto','Enabled','Disabled'],{rb:1});
add('IMC_Bclk','Enumeration','133','IMC BCLK (MHz)','IMC基准时钟','./Advanced/MemoryConfig','Integrated Memory Controller base clock in MHz.',['100','133'],{rb:1});
add('MemTestOnBoot','Enumeration','Fast','Memory Test on Boot','开机内存测试','./Advanced/MemoryConfig','POST memory test. Full checks every cell; Fast runs quick patterns.',['Full','Fast','Disabled']);
add('ColdMemTest','Enumeration','Full','Cold Boot Mem Test','冷启动内存测试','./Advanced/MemoryConfig','Memory test performed only on cold boot from S5 power-on state.',['Full','Short','Disabled']);
add('ECCSupport','Enumeration','Enabled','ECC Support','ECC纠错','./Advanced/MemoryConfig','Error Correction Code for single-bit correction and multi-bit detection.',['Enabled'],{rb:1,ro:1});

// === MemoryRAS (9) ===
add('PatrolScrub','Enumeration','Enabled','Patrol Scrub','内存巡检','./Advanced/MemoryConfig/MemoryRAS','Background patrol scrub to detect and correct memory errors proactively.',['Enabled','Disabled']);
add('PatrolScrubInterval','Integer',24,'Patrol Scrub Interval (h)','巡检间隔','./Advanced/MemoryConfig/MemoryRAS','Patrol scrub cycle interval in hours for correction frequency.',[],{lb:1,ub:72,st:1});
add('DemandScrub','Enumeration','Enabled','Demand Scrub','按需清理','./Advanced/MemoryConfig/MemoryRAS','On-demand scrubbing when reading data corrects errors immediately.',['Enabled','Disabled']);
add('WriteCRC','Enumeration','Enabled','Write Data CRC','写入CRC','./Advanced/MemoryConfig/MemoryRAS','CRC protection from memory controller to DRAM for data integrity.',['Enabled','Disabled']);
add('MemHClk','Enumeration','Enabled','Memory Half Clock','半时钟','./Advanced/MemoryConfig/MemoryRAS','Memory half-clock mode for power savings at reduced bandwidth.',['Enabled','Disabled']);
add('ADR_DataSave','Enumeration','Enabled','ADR Data Save','ADR数据保存','./Advanced/MemoryConfig/MemoryRAS','ADR data save on power loss to protect critical buffered data.',['Enabled','Disabled']);
add('ErrInjection','Enumeration','Disabled','Error Injection','错误注入','./Advanced/MemoryConfig/MemoryRAS','Artificial error injection for RAS testing only. Not for production.',['Enabled','Disabled']);
add('MemErrThreshold','Integer',10,'Error Threshold','错误阈值','./Advanced/MemoryConfig/MemoryRAS','Correctable error threshold before predictive failure alert.',[],{lb:1,ub:100,st:1});
add('PostPackageRepair','Enumeration','Enabled','POST Package Repair','POST修复','./Advanced/MemoryConfig/MemoryRAS','POST-time package repair maps out bad cells using spare rows/columns.',['Enabled','Disabled']);

// === MemoryTiming (4) ===
add('MemRefreshRate','Enumeration','1x','Memory Refresh Rate','刷新速率','./Advanced/MemoryConfig/MemoryTiming','DRAM refresh interval multiplier for data retention reliability.',['1x (normal)','2x','4x (high reliability)']);
add('tRFC_Timing','Enumeration','Auto','tRFC Timing','tRFC时序','./Advanced/MemoryConfig/MemoryTiming','Row Refresh Cycle Time for stability with high-density DIMMs.',['Auto','Normal','Extended']);
add('CMD2T_Mode','Enumeration','Auto','Command 2T Mode','2T命令','./Advanced/MemoryConfig/MemoryTiming','DRAM command rate. 1T=lower latency; 2T=better stability at speed.',['Auto','1T','2T']);
add('BankGroupSwap','Enumeration','Auto','Bank Group Swap','Bank组交换','./Advanced/MemoryConfig/MemoryTiming','Swap physical bank group mapping to optimize row buffer hit rates.',['Auto','Enabled','Disabled']);

// === MemoryInterleave (5) ===
add('MemInterleaveGran','Enumeration','Auto','Interleave Granularity','交织粒度','./Advanced/MemoryConfig/MemoryInterleave','Memory interleave block size for access distribution.',['Auto','256B','4KB','1GB']);
add('MemInterleaveSize','Enumeration','Auto','Interleave Size','交织大小','./Advanced/MemoryConfig/MemoryInterleave','Number of channels to interleave for parallel bandwidth.',['Auto','1-Way','2-Way','4-Way','8-Way']);
add('ChanInterleave','Enumeration','Auto','Channel Interleave','通道交织','./Advanced/MemoryConfig/MemoryInterleave','Distribute cache lines across channels for maximum bandwidth.',['Auto','1-Way','2-Way','4-Way']);
add('RankInterleave','Enumeration','Auto','Rank Interleave','Rank交织','./Advanced/MemoryConfig/MemoryInterleave','Distribute accesses across DRAM ranks to reduce latency.',['Auto','1-Way','2-Way','4-Way']);
add('SocketInterleave','Enumeration','Auto','Socket Interleave','Socket交织','./Advanced/MemoryConfig/MemoryInterleave','N-way interleave across CPU sockets for balanced bandwidth.',['Auto','Enabled','Disabled']);

// === MemorySparing (5) ===
add('RankSparing','Enumeration','Disabled','Rank Sparing','Rank备用','./Advanced/MemoryConfig/MemorySparing','Reserve spare DRAM rank to replace failing rank at capacity cost.',['Enabled','Disabled'],{rb:1});
add('BankSparing','Enumeration','Disabled','Bank Sparing','Bank备用','./Advanced/MemoryConfig/MemorySparing','Reserve spare banks within each rank for finer-grained sparing.',['Enabled','Disabled']);
add('MemMirroring','Enumeration','Disabled','Memory Mirroring','内存镜像','./Advanced/MemoryConfig/MemorySparing','Full memory mirroring duplicates writes across channels.',['Enabled','Disabled'],{rb:1});
add('PartialMirrorRatio','Enumeration','Auto','Partial Mirror Ratio','部分镜像比例','./Advanced/MemoryConfig/MemorySparing','Ratio of mirrored to non-mirrored memory in partial mirroring.',['Auto','1/2','1/4','1/8']);
add('ADR_SelfRefresh','Enumeration','Enabled','ADR Self Refresh','ADR自刷新','./Advanced/MemoryConfig/MemorySparing','ADR self-refresh preserves DRAM data during emergency power loss.',['Enabled','Disabled']);

// === StorageConfig (10) ===
add('SataController','Enumeration','AHCI','SATA Controller Mode','SATA控制器','./Advanced/StorageConfig','SATA mode. AHCI=native queuing; RAID=firmware RAID; Disabled=off.',['AHCI','RAID','Disabled'],{rb:1});
add('NVMeMode','Enumeration','BIOS','NVMe SSD Mode','NVMe模式','./Advanced/StorageConfig','NVMe management. BIOS=legacy mode; OS=native driver passthrough.',['BIOS','OS'],{rb:1});
add('BootDiskPriority','Enumeration','NVMe','Boot Disk Priority','启动盘优先级','./Advanced/StorageConfig','Preferred boot disk interface for boot order prioritization.',['NVMe','SATA','Auto']);
add('HDDWriteCache','Enumeration','Enabled','HDD Write Cache','硬盘写缓存','./Advanced/StorageConfig','HDD write-back cache for write performance; disable for data safety.',['Enabled','Disabled']);
add('SMARTReporting','Enumeration','Enabled','S.M.A.R.T. Reporting','SMART报告','./Advanced/StorageConfig','S.M.A.R.T. monitoring and failure prediction during POST.',['Enabled','Disabled']);
add('NVMeHotPlug','Enumeration','Enabled','NVMe Hot Plug','NVMe热插拔','./Advanced/StorageConfig','NVMe hot-plug for adding/removing drives without shutdown.',['Enabled','Disabled']);
add('NVMeMaxSpeed','Enumeration','Gen5','NVMe Max Link Speed','NVMe最大速率','./Advanced/StorageConfig','PCIe link speed cap for NVMe devices for signal integrity.',['Auto','Gen5','Gen4','Gen3']);
add('HDDReadAhead','Enumeration','Enabled','HDD Read Ahead','硬盘预读','./Advanced/StorageConfig','HDD read-ahead prefetch for improved sequential read performance.',['Enabled','Disabled']);
add('DMA_Support','Enumeration','Enabled','DMA Support','DMA支持','./Advanced/StorageConfig','Direct Memory Access for storage controllers to improve I/O.',['Enabled','Disabled']);
add('SpinUpDelay','Integer',3,'HDD Spin-Up Delay (s)','硬盘启动延迟','./Advanced/StorageConfig','HDD spin-up stagger delay to reduce peak power draw at startup.',[],{lb:0,ub:30,st:1});

// === OptanePMem (5) ===
add('PMem_Performance','Enumeration','BW Optimized','PMem Performance','PMem性能','./Advanced/StorageConfig/OptanePMem','Optane PMem performance profile for bandwidth or latency optimization.',['BW Optimized','Latency Optimized','Balanced']);
add('PMem_MemoryMode','Enumeration','App Direct','PMem Mode','PMem模式','./Advanced/StorageConfig/OptanePMem','App Direct=persistent storage; Memory Mode=cache-backed volatile memory.',['App Direct','Memory Mode','Mixed']);
add('PMem_AppDirectSize','Integer',0,'PMem AppDirect Size (GB)','AppDirect大小','./Advanced/StorageConfig/OptanePMem','PMem capacity in GB for App Direct mode in Mixed configuration.',[],{lb:0,ub:6144,st:1});
add('PMem_NamespaceLabel','String','','PMem Namespace Label','命名空间标签','./Advanced/StorageConfig/OptanePMem','User-defined label for PMem namespace identification.',[],{mx:63});
add('PMem_SecurityFreeze','Enumeration','Enabled','PMem Security Freeze','安全冻结','./Advanced/StorageConfig/OptanePMem','Freeze PMem security state to prevent runtime modification.',['Enabled','Disabled']);

// === NetworkStack (6) ===
add('PXEBoot','Enumeration','Enabled','PXE Network Boot','PXE网络启动','./Advanced/NetworkStack','PXE network boot for OS deployment from a network server.',['Enabled','Disabled'],{rb:1});
add('HttpBoot','Enumeration','Disabled','HTTP Boot','HTTP启动','./Advanced/NetworkStack','HTTP/HTTPS boot for OS installation from web servers.',['Enabled','Disabled']);
add('iSCSIBoot','Enumeration','Disabled','iSCSI Boot','iSCSI启动','./Advanced/NetworkStack','Boot from iSCSI storage target over TCP/IP network.',['Enabled','Disabled']);
add('WakeOnLan','Enumeration','Enabled','Wake-on-LAN','网络唤醒','./Advanced/NetworkStack','Remote wake-up via magic packet received over the network.',['Enabled','Disabled']);
add('IPv4Stack','Enumeration','Enabled','IPv4 Protocol Stack','IPv4协议栈','./Advanced/NetworkStack','IPv4 protocol stack support for network boot and communication.',['Enabled','Disabled']);
add('IPv6Stack','Enumeration','Enabled','IPv6 Protocol Stack','IPv6协议栈','./Advanced/NetworkStack','IPv6 protocol stack support for modern network environments.',['Enabled','Disabled']);

// === UEFI_Network (5) ===
add('UEFI_IPv4_HTTP','Enumeration','Enabled','IPv4 HTTP Boot','IPv4 HTTP启动','./Advanced/NetworkStack/UEFI_Network','IPv4 HTTP boot in UEFI mode for network deployment.',['Enabled','Disabled']);
add('UEFI_IPv6_HTTP','Enumeration','Disabled','IPv6 HTTP Boot','IPv6 HTTP启动','./Advanced/NetworkStack/UEFI_Network','IPv6 HTTP boot in UEFI mode for modern networks.',['Enabled','Disabled']);
add('UEFI_PXE_RetryCount','Integer',4,'PXE Retry Count','PXE重试次数','./Advanced/NetworkStack/UEFI_Network','Number of PXE retry attempts before next boot device.',[],{lb:0,ub:20,st:1});
add('UEFI_VLAN_Enable','Enumeration','Disabled','UEFI VLAN Support','UEFI VLAN','./Advanced/NetworkStack/UEFI_Network','VLAN tagging for UEFI network boot traffic isolation.',['Enabled','Disabled']);
add('UEFI_VLAN_ID','Integer',0,'UEFI VLAN ID','VLAN ID','./Advanced/NetworkStack/UEFI_Network','VLAN ID 0-4095 for UEFI network boot traffic.',[],{lb:0,ub:4095,st:1});

// === iSCSI_Config (6) ===
add('iSCSI_InitiatorName','String','','iSCSI Initiator Name','iSCSI启动器','./Advanced/NetworkStack/iSCSI_Config','iSCSI initiator IQN name for target identification.',[],{mn:1,mx:256});
add('iSCSI_IPMode','Enumeration','DHCP','iSCSI IP Mode','iSCSI IP模式','./Advanced/NetworkStack/iSCSI_Config','iSCSI IP assignment. DHCP automatic; Static manual.',['DHCP','Static']);
add('iSCSI_TargetIP','String','','iSCSI Target IP','iSCSI目标IP','./Advanced/NetworkStack/iSCSI_Config','iSCSI target storage server IP address.',[],{mn:7,mx:15});
add('iSCSI_TargetPort','Integer',3260,'iSCSI Target Port','iSCSI目标端口','./Advanced/NetworkStack/iSCSI_Config','iSCSI target service port number for connections.',[],{lb:1,ub:65535,st:1});
add('iSCSI_CHAP_Enable','Enumeration','Disabled','iSCSI CHAP Auth','CHAP认证','./Advanced/NetworkStack/iSCSI_Config','CHAP authentication for secure iSCSI connections.',['Enabled','Disabled']);
add('iSCSI_CHAP_User','String','','CHAP Username','CHAP用户名','./Advanced/NetworkStack/iSCSI_Config','CHAP username credential for iSCSI authentication.',[],{mn:1,mx:128});

// === PowerMgmt (6) ===
add('PowerPolicy','Enumeration','Balanced','Power Policy','功耗策略','./Advanced/PowerMgmt','System power profile. MaxPerf=performance; PowerSave=lowest power.',['Max Performance','Balanced','Power Save','Custom']);
add('PowerCapEnable','Enumeration','Disabled','Power Cap','功率封顶','./Advanced/PowerMgmt','Enable power capping to limit maximum system power consumption.',['Enabled','Disabled']);
add('PowerCapValue','Integer',800,'Power Cap Value (W)','封顶值(W)','./Advanced/PowerMgmt','Maximum system power consumption cap in watts.',[],{lb:200,ub:2000,st:50});
add('PowerCapAction','Enumeration','Throttle','Power Cap Action','封顶动作','./Advanced/PowerMgmt','Action when cap exceeded. Throttle reduces frequency; Shutdown off.',['Throttle','Shutdown']);
add('ASPMSupport','Enumeration','Auto','ASPM Support','ASPM节能','./Advanced/PowerMgmt','ASPM for PCIe power saving. Auto allows L1; L1 Only deepest state.',['Auto','L1 Only','Disabled']);
add('PcieHotPlugPower','Enumeration','Enabled','PCIe Hot Plug Power','PCIe热插拔供电','./Advanced/PowerMgmt','PCIe hot-plug power management for dynamic device addition.',['Enabled','Disabled']);

// === CPU_Power (9) ===
add('EIST','Enumeration','Enabled','SpeedStep (EIST)','EIST节能','./Advanced/PowerMgmt/CPU_Power','Enhanced Intel SpeedStep for dynamic frequency/voltage scaling.',['Enabled','Disabled']);
add('HWP','Enumeration','Enabled','HWP (Speed Shift)','HWP频率调节','./Advanced/PowerMgmt/CPU_Power','Hardware-controlled P-states for faster frequency transitions.',['Enabled','Disabled']);
add('HWPMState','Enumeration','Native','HPM State','HPM模式','./Advanced/PowerMgmt/CPU_Power','Hardware Power Management. Native=firmware; OOB=BMC controlled.',['Native','Out-of-Band','Disabled']);
add('PStateDomain','Enumeration','Auto','P-State Domain','P状态域','./Advanced/PowerMgmt/CPU_Power','P-State coordination. ALL=package-wide; ONE=per-core independent.',['Auto','ALL','ONE']);
add('PStateLimit','Enumeration','Auto','P-State Limit','P状态限制','./Advanced/PowerMgmt/CPU_Power','Maximum P-State level. P0=highest frequency; lower reduces frequency.',['Auto','P0','P1','P2','P3']);
add('TStateEnable','Enumeration','Enabled','T-States','T状态','./Advanced/PowerMgmt/CPU_Power','Enable T-States for thermal throttling via duty cycle modulation.',['Enabled','Disabled']);
add('EnergyPerfBias','Enumeration','Balanced','Energy Perf Bias','能效偏向','./Advanced/PowerMgmt/CPU_Power','Energy-performance bias for power management optimization.',['Max Performance','Balanced','Power Save']);
add('UncoreFreq','Enumeration','Auto','Uncore Frequency','非核心频率','./Advanced/PowerMgmt/CPU_Power','Uncore frequency for ring/mesh. Max=highest; Min=lowest power.',['Auto','Max','Min']);
add('CPU_PowerReport','Enumeration','Auto','CPU Power Report','CPU功耗报告','./Advanced/PowerMgmt/CPU_Power','CPU power report granularity: PerCPU or PerPackage.',['Auto','Per CPU','Per Package']);

// === PackageCState (3) ===
add('PackageCState_Limit','Enumeration','Auto','Package C-State Limit','封装C状态','./Advanced/PowerMgmt/CPU_Power/PackageCState','Maximum package C-State. Deeper states save power, increase exit latency.',['Auto','C2','C6','C7','C8','C9','C10','NoLimit']);
add('PKG_C1E_Auto','Enumeration','Enabled','Package C1E Auto','封装C1E','./Advanced/PowerMgmt/CPU_Power/PackageCState','Automatic package-level C1E entry when all cores idle.',['Enabled','Disabled']);
add('PKG_C6_Retention','Enumeration','Enabled','Package C6 Retention','封装C6保持','./Advanced/PowerMgmt/CPU_Power/PackageCState','Package C6 retention for faster exit at slightly higher idle power.',['Enabled','Disabled']);

// === UPI_Power (3) ===
add('UPI_LinkL0p','Enumeration','Enabled','UPI Link L0p','UPI L0p','./Advanced/PowerMgmt/CPU_Power/UPI_Power','UPI L0p low-power state during low link utilization.',['Enabled','Disabled']);
add('UPI_LinkL1','Enumeration','Enabled','UPI Link L1','UPI L1','./Advanced/PowerMgmt/CPU_Power/UPI_Power','UPI L1 deeper low-power state for extended idle periods.',['Enabled','Disabled']);
add('UPI_PowerGating','Enumeration','Enabled','UPI Power Gating','UPI电源门控','./Advanced/PowerMgmt/CPU_Power/UPI_Power','UPI power gating to completely power down unused UPI lanes.',['Enabled','Disabled']);

// === PState_HWPM (4) ===
add('HWPM_NativeMode','Enumeration','Enabled','HWPM Native Mode','HWPM原生','./Advanced/PowerMgmt/CPU_Power/PState_HWPM','HWPM native mode for firmware-controlled power management.',['Enabled','Disabled']);
add('HWPM_OOB_Mode','Enumeration','Disabled','HWPM OOB Mode','HWPM带外','./Advanced/PowerMgmt/CPU_Power/PState_HWPM','HWPM Out-of-Band mode for BMC-managed power management.',['Enabled','Disabled']);
add('HWPM_PackageControl','Enumeration','Enabled','HWPM Package Control','HWPM封装控制','./Advanced/PowerMgmt/CPU_Power/PState_HWPM','HWPM package-level control for coordinated frequency transitions.',['Enabled','Disabled']);
add('HWPM_PerCorePState','Enumeration','Enabled','HWPM Per-Core P-State','每核P状态','./Advanced/PowerMgmt/CPU_Power/PState_HWPM','HWPM per-core P-State for asymmetric frequency across cores.',['Enabled','Disabled']);

// === IMON_Config (3) ===
add('IMON_Slope','Integer',100,'IMON Slope (%)','IMON斜率','./Advanced/PowerMgmt/CPU_Power/IMON_Config','IMON current slope calibration for power reporting accuracy.',[],{lb:0,ub:200,st:1});
add('IMON_Offset','Integer',0,'IMON Offset (W)','IMON偏移','./Advanced/PowerMgmt/CPU_Power/IMON_Config','IMON current offset in watts for fine-tuning power measurements.',[],{lb:-100,ub:100,st:1});
add('IMON_PeakCurrent','Integer',0,'IMON Peak Current (A)','IMON峰值电流','./Advanced/PowerMgmt/CPU_Power/IMON_Config','IMON peak current limit in amperes for overcurrent protection.',[],{lb:0,ub:500,st:1});

// === ThermalMgmt (5) ===
add('FanPWM_Min','Integer',20,'Min Fan PWM (%)','最小风扇PWM','./Advanced/PowerMgmt/ThermalMgmt','Minimum fan PWM duty cycle. Higher=cooling; lower=quieter.',[],{lb:10,ub:100,st:5});
add('FanProfile','Enumeration','Auto','Fan Profile','风扇策略','./Advanced/PowerMgmt/ThermalMgmt','Fan speed profile. Auto=temperature-based; LowNoise=quiet.',['Auto','Low Noise','Full Speed','Custom']);
add('ThermalTrip','Enumeration','Enabled','Thermal Trip','热保护','./Advanced/PowerMgmt/ThermalMgmt','Thermal trip protection shuts down at critical CPU temperature.',['Enabled','Disabled']);
add('Prochot_Assert','Enumeration','Enabled','PROCHOT Assert','PROCHOT信号','./Advanced/PowerMgmt/ThermalMgmt','PROCHOT signal for external thermal management integration.',['Enabled','Disabled']);
add('CloseLoopThermalThrot','Enumeration','Enabled','Closed-Loop Thermal Throttling','闭环热节流','./Advanced/PowerMgmt/ThermalMgmt','Closed-loop throttling uses actual temperature for precise control.',['Enabled','Disabled']);

// === PCIeConfig (12) ===
add('PCIeMaxSpeed','Enumeration','Auto','PCIe Max Speed','PCIe最大速率','./Advanced/PCIeConfig','Maximum PCIe link speed. Auto uses fastest mutually supported generation.',['Auto','Gen1','Gen2','Gen3','Gen4','Gen5']);
add('PCIeAER','Enumeration','Enabled','PCIe AER','PCIe AER','./Advanced/PCIeConfig','PCIe Advanced Error Reporting for detailed error detection and logging.',['Enabled','Disabled']);
add('PCIeECS','Enumeration','Enabled','PCIe ECRC','PCIe ECRC','./Advanced/PCIeConfig','PCIe ECRC for end-to-end data integrity checking on PCIe links.',['Enabled','Disabled']);
add('PCIeAtomicOps','Enumeration','Enabled','PCIe Atomic Ops','PCIe原子操作','./Advanced/PCIeConfig','PCIe atomic operations for lock-free inter-device communication.',['Enabled','Disabled']);
add('PCIeACS','Enumeration','Enabled','PCIe ACS','PCIe ACS','./Advanced/PCIeConfig','PCIe Access Control Services for improved device isolation.',['Enabled','Disabled']);
add('PCIe10BitTag','Enumeration','Auto','PCIe 10-Bit Tag','PCIe 10位标签','./Advanced/PCIeConfig','PCIe 10-Bit Tag for increased outstanding transaction capacity.',['Auto','Enabled','Disabled']);
add('PCIe_SR_IOV','Enumeration','Enabled','SR-IOV Global','SR-IOV全局','./Advanced/PCIeConfig','SR-IOV for sharing PCIe devices across virtual machines.',['Enabled','Disabled']);
add('PCIeRelaxedOrder','Enumeration','Enabled','PCIe Relaxed Ordering','PCIe宽松序','./Advanced/PCIeConfig','PCIe relaxed transaction ordering for improved throughput.',['Enabled','Disabled']);
add('Above4GDecoding','Enumeration','Enabled','Above 4G Decoding','大于4G解码','./Advanced/PCIeConfig','Above 4G MMIO decoding for large BAR device address spaces.',['Enabled','Disabled']);
add('ReSizeBAR','Enumeration','Enabled','Re-Size BAR Support','Resizable BAR','./Advanced/PCIeConfig','Resizable BAR to expose GPU VRAM as single contiguous region.',['Enabled','Disabled']);
add('ARI_Forwarding','Enumeration','Enabled','ARI Forwarding','ARI转发','./Advanced/PCIeConfig','Alternative Routing-ID for multi-function PCIe device support.',['Enabled','Disabled']);
add('MCTP_PCIe','Enumeration','Enabled','MCTP over PCIe','PCIe MCTP','./Advanced/PCIeConfig','MCTP over PCIe for out-of-band device management.',['Enabled','Disabled']);

// === PerSlot (8) ===
add('Slot1_OpROM','Enumeration','Enabled','Slot 1 Option ROM','槽1 OpROM','./Advanced/PCIeConfig/PerSlot','Slot 1 Option ROM execution for legacy device initialization.',['Enabled','Disabled']);
add('Slot2_OpROM','Enumeration','Enabled','Slot 2 Option ROM','槽2 OpROM','./Advanced/PCIeConfig/PerSlot','Slot 2 Option ROM execution for legacy device initialization.',['Enabled','Disabled']);
add('Slot3_OpROM','Enumeration','Enabled','Slot 3 Option ROM','槽3 OpROM','./Advanced/PCIeConfig/PerSlot','Slot 3 Option ROM execution for legacy device initialization.',['Enabled','Disabled']);
add('Slot4_OpROM','Enumeration','Enabled','Slot 4 Option ROM','槽4 OpROM','./Advanced/PCIeConfig/PerSlot','Slot 4 Option ROM execution for legacy device initialization.',['Enabled','Disabled']);
add('Slot1_MaxSpeed','Enumeration','Auto','Slot 1 Max Speed','槽1最大速率','./Advanced/PCIeConfig/PerSlot','Per-slot PCIe maximum link speed for Slot 1.',['Auto','Gen1','Gen2','Gen3','Gen4','Gen5']);
add('Slot2_MaxSpeed','Enumeration','Auto','Slot 2 Max Speed','槽2最大速率','./Advanced/PCIeConfig/PerSlot','Per-slot PCIe maximum link speed for Slot 2.',['Auto','Gen1','Gen2','Gen3','Gen4','Gen5']);
add('Slot3_MaxSpeed','Enumeration','Auto','Slot 3 Max Speed','槽3最大速率','./Advanced/PCIeConfig/PerSlot','Per-slot PCIe maximum link speed for Slot 3.',['Auto','Gen1','Gen2','Gen3','Gen4','Gen5']);
add('Slot4_MaxSpeed','Enumeration','Auto','Slot 4 Max Speed','槽4最大速率','./Advanced/PCIeConfig/PerSlot','Per-slot PCIe maximum link speed for Slot 4.',['Auto','Gen1','Gen2','Gen3','Gen4','Gen5']);

// === USBConfig (8) ===
add('USBPorts_All','Enumeration','Enabled','All USB Ports','全部USB','./Advanced/USBConfig','Global control for all USB ports.',['Enabled','Disabled']);
add('USBFrontPorts','Enumeration','Enabled','Front USB Ports','前置USB','./Advanced/USBConfig','Front panel USB ports enable/disable.',['Enabled','Disabled']);
add('USBRearPorts','Enumeration','Enabled','Rear USB Ports','后置USB','./Advanced/USBConfig','Rear panel USB ports enable/disable.',['Enabled','Disabled']);
add('USBInternalPorts','Enumeration','Enabled','Internal USB Ports','内置USB','./Advanced/USBConfig','Internal USB ports for embedded devices.',['Enabled','Disabled']);
add('USB30Support','Enumeration','Enabled','USB 3.0 Support','USB 3.0支持','./Advanced/USBConfig','USB 3.0 SuperSpeed support for USB ports.',['Enabled','Disabled']);
add('USB30_Legacy','Enumeration','Enabled','USB 3.0 Legacy','USB 3.0 Legacy','./Advanced/USBConfig','USB 3.0 legacy mode for non-UEFI compatibility.',['Enabled','Disabled']);
add('XHCI_HandOff','Enumeration','Enabled','XHCI Hand-off','XHCI移交','./Advanced/USBConfig','XHCI hand-off to OS for native xHCI controller support.',['Enabled','Disabled']);
add('USB_KB_Mouse_Timer','Integer',0,'USB KB/Mouse Timer (s)','USB键鼠超时','./Advanced/USBConfig','USB keyboard/mouse initialization timeout in seconds.',[],{lb:0,ub:30,st:1});

// === USB_MassStorage (5) ===
add('USB_MassStorage_Reset','Integer',20,'USB Mass Storage Reset (s)','USB存储超时','./Advanced/USBConfig/USB_MassStorage','USB mass storage device reset timeout in seconds.',[],{lb:5,ub:60,st:5});
add('USB_CDROM_Boot','Enumeration','Enabled','USB CD-ROM Boot','USB光驱','./Advanced/USBConfig/USB_MassStorage','USB CD-ROM/DVD drive boot support.',['Enabled','Disabled']);
add('USB_Floppy_Boot','Enumeration','Enabled','USB Floppy Boot','USB软驱','./Advanced/USBConfig/USB_MassStorage','USB floppy drive boot support.',['Enabled','Disabled']);
add('USB_HDD_MaxDevices','Integer',8,'USB HDD Max Devices','USB硬盘数','./Advanced/USBConfig/USB_MassStorage','Maximum number of USB HDD devices recognized.',[],{lb:0,ub:16,st:1});
add('USB_EHCI_Controller','Enumeration','Enabled','USB EHCI Controller','EHCI控制器','./Advanced/USBConfig/USB_MassStorage','USB EHCI controller enable for USB 2.0 compatibility.',['Enabled','Disabled']);

// === SerialConfig (9) ===
add('SerialConsole','Enumeration','Enabled','Serial Console','串口控制台','./Advanced/SerialConfig','Enable serial console for headless server operation.',['Enabled','Disabled']);
add('BaudRate','Enumeration','115200','Serial Baud Rate','波特率','./Advanced/SerialConfig','Serial port communication speed in bits per second.',['9600','19200','38400','57600','115200']);
add('DataBits','Enumeration','8','Serial Data Bits','数据位','./Advanced/SerialConfig','Number of data bits per serial communication frame.',['7','8']);
add('Parity','Enumeration','None','Serial Parity','校验位','./Advanced/SerialConfig','Serial parity check mode for error detection.',['None','Even','Odd']);
add('StopBits','Enumeration','1','Serial Stop Bits','停止位','./Advanced/SerialConfig','Number of stop bits per serial communication frame.',['1','2']);
add('FlowControl','Enumeration','None','Flow Control','流控制','./Advanced/SerialConfig','Serial flow control for data transmission pacing.',['None','RTS/CTS','Xon/Xoff']);
add('TerminalType','Enumeration','VT100+','Terminal Type','终端类型','./Advanced/SerialConfig','Terminal emulation type for serial console output.',['VT100+','VT-UTF8','ANSI']);
add('ConsoleRedirection','Enumeration','Serial','Console Redirection','控制台重定向','./Advanced/SerialConfig','Console output target. Serial=COM port; VGA=display.',['Serial','VGA','Auto']);
add('SOL_BaudRate','Enumeration','115200','SOL Baud Rate','SOL波特率','./Advanced/SerialConfig','Serial-over-LAN baud rate for remote console access via BMC.',['9600','19200','38400','57600','115200']);

// === GraphicsConfig (6) ===
add('PrimaryDisplay','Enumeration','Auto','Primary Display','主显示设备','./Advanced/GraphicsConfig','Primary display output device priority.',['Auto','Onboard','PCIe']);
add('OnboardVGA','Enumeration','Enabled','Onboard VGA','板载VGA','./Advanced/GraphicsConfig','Onboard VGA controller enable/disable for discrete GPU use.',['Enabled','Disabled']);
add('VGA_PaletteSnoop','Enumeration','Disabled','VGA Palette Snoop','调色板侦听','./Advanced/GraphicsConfig','VGA palette snoop for legacy video card compatibility.',['Enabled','Disabled']);
add('GOP_Driver_Ver','String','v20.0','GOP Driver Version','GOP驱动版本','./Advanced/GraphicsConfig','Graphics Output Protocol driver version.',[],{ro:1});
add('VGA_ROM_Exec','Enumeration','UEFI','VGA ROM Execution','VGA ROM执行','./Advanced/GraphicsConfig','VGA ROM execution mode. UEFI=GOP; Legacy=VBIOS.',['UEFI','Legacy']);
add('Gfx_LowPower','Enumeration','Enabled','Graphics Low Power','显卡低功耗','./Advanced/GraphicsConfig','Graphics controller low-power mode to reduce consumption.',['Enabled','Disabled']);

// === SMIConfig (4) ===
add('SMI_Lock','Enumeration','Enabled','SMI Lock','SMI锁定','./Advanced/SMIConfig','SMI lock to prevent unauthorized SMM modifications.',['Enabled','Disabled']);
add('SMI_Timeout','Integer',0,'SMI Timeout (ms)','SMI超时','./Advanced/SMIConfig','SMI handler timeout in milliseconds for watchdog protection.',[],{lb:0,ub:65535,st:100});
add('SMM_SaveState','Enumeration','Enabled','SMM Save State','SMM保存状态','./Advanced/SMIConfig','SMM save state area for context preservation during SMM entry.',['Enabled','Disabled']);
add('SoftwareSMI','Enumeration','Enabled','Software SMI','软件SMI','./Advanced/SMIConfig','Software-generated SMI for OS-to-firmware communication.',['Enabled','Disabled'],{sc:'定制',sr:false});

// === RASConfig (8) ===
add('MCE_Recovery','Enumeration','Enabled','MCE Recovery','MCE恢复','./Advanced/RASConfig','Enable Machine Check Exception recovery for uncorrected errors.',['Enabled','Disabled']);
add('eMCA_Gen2','Enumeration','Enabled','eMCA Gen2','eMCA第二代','./Advanced/RASConfig','Enhanced MCA Generation 2 for detailed hardware error reporting.',['Enabled','Disabled']);
add('WHEA_Support','Enumeration','Enabled','WHEA Support','WHEA支持','./Advanced/RASConfig','Windows Hardware Error Architecture for structured error reporting.',['Enabled','Disabled']);
add('BiosGuard','Enumeration','Enabled','BIOS Guard','BIOS防护','./Advanced/RASConfig','BIOS Guard protects the flash region from unauthorized modification.',['Enabled','Disabled']);
add('BiosRecovery','Enumeration','Enabled','BIOS Recovery','BIOS恢复','./Advanced/RASConfig','Automatic recovery from corrupted BIOS using redundant flash.',['Enabled','Disabled']);
add('CrashDump','Enumeration','Enabled','Crash Dump Support','崩溃转储','./Advanced/RASConfig','Enable crash dump support for post-mortem debugging of failures.',['Enabled','Disabled']);
add('CorrectableErrLimit','Integer',10,'Correctable Err Limit','可纠正错误阈值','./Advanced/RASConfig','Correctable error limit before escalation to uncorrectable.',[],{lb:1,ub:500,st:5});
add('UncorrectableErrHalt','Enumeration','Disabled','Halt on Uncorrectable','不可纠正停机','./Advanced/RASConfig','Halt system on uncorrectable error to prevent data corruption.',['Enabled','Disabled']);

// === MemRAS (4) ===
add('MCE_Threshold','Integer',5,'MCE Threshold','MCE阈值','./Advanced/RASConfig/MemRAS','Machine Check Exception threshold count before OS notification.',[],{lb:1,ub:100,st:1});
add('CMCI_Support','Enumeration','Enabled','CMCI Support','CMCI支持','./Advanced/RASConfig/MemRAS','Corrected Machine Check Interrupt for asynchronous error notification.',['Enabled','Disabled']);
add('CMCI_Threshold','Integer',10,'CMCI Threshold','CMCI阈值','./Advanced/RASConfig/MemRAS','Corrected error count before generating a CMCI interrupt.',[],{lb:1,ub:100,st:1});
add('DoubleBitErrHalt','Enumeration','Enabled','Double-Bit Error Halt','双位错误停机','./Advanced/RASConfig/MemRAS','Immediate halt on uncorrectable double-bit memory errors.',['Enabled','Disabled']);

// === MiscConfig (13) ===
add('SMBIOS_EventLog','Enumeration','Enabled','SMBIOS Event Log','SMBIOS事件','./Advanced/MiscConfig','SMBIOS event log for platform event recording.',['Enabled','Disabled']);
add('PCI64BitResource','Enumeration','Enabled','64-bit PCI Resource','64位PCI资源','./Advanced/MiscConfig','64-bit PCI resource allocation for large BAR devices.',['Enabled','Disabled']);
add('AttemptVGAFirst','Enumeration','Onboard','VGA Priority','VGA优先','./Advanced/MiscConfig','VGA initialization priority between onboard and add-in cards.',['Onboard','Offboard','Auto']);
add('OSWatchdogTimer','Enumeration','Enabled','OS Watchdog Timer','OS看门狗','./Advanced/MiscConfig','OS watchdog timer for automatic reset on OS hang.',['Enabled','Disabled']);
add('OSWatchdogTimeout','Integer',10,'OS Watchdog Timeout (m)','OS看门狗超时','./Advanced/MiscConfig','OS watchdog timeout in minutes before automatic reset.',[],{lb:1,ub:60,st:1});
add('MaxPayloadSize','Enumeration','Auto','PCIe Max Payload Size','最大有效载荷','./Advanced/MiscConfig','PCIe maximum TLP payload size for throughput optimization.',['Auto','128B','256B','512B']);
add('MaxReadReqSize','Enumeration','Auto','PCIe Max Read Req Size','最大读取请求','./Advanced/MiscConfig','PCIe maximum memory read request size for optimization.',['Auto','128B','256B','512B','1024B']);
add('POST_ErrorPause','Enumeration','Enabled','POST Error Pause','POST错误暂停','./Advanced/MiscConfig','Pause POST on non-critical errors for manual acknowledgment.',['Enabled','Disabled']);
add('UEFI_Shell','Enumeration','Enabled','UEFI Shell','UEFI Shell','./Advanced/MiscConfig','UEFI Shell for pre-boot diagnostics and scripting.',['Enabled','Disabled']);
add('MemMap_IO_Limit','Enumeration','Auto','Memory Mapped I/O Limit','MMIO上限','./Advanced/MiscConfig','Memory-mapped I/O address space limit for large configurations.',['Auto','2 GB','4 GB','8 GB','16 GB','64 GB']);
add('ACPI_HPET','Enumeration','Enabled','ACPI HPET Table','HPET表','./Advanced/MiscConfig','ACPI High Precision Event Timer table for accurate timing.',['Enabled','Disabled']);
add('ACPI_SRAT_L3_as_NUMA','Enumeration','Enabled','SRAT L3 as NUMA','L3 NUMA','./Advanced/MiscConfig','Expose L3 cache as NUMA domain in SRAT for cache-aware scheduling.',['Enabled','Disabled']);
add('Above4G_Boot','Enumeration','Enabled','Above 4G MMIO BIOS Assign','4G以上MMIO','./Advanced/MiscConfig','Above 4G MMIO BIOS assignment for large PCIe address spaces.',['Enabled','Disabled']);

// === TrustedExecution (3) ===
add('TXT_ACM_Rev','String','v3.0','TXT ACM Revision','TXT ACM版本','./Advanced/MiscConfig/TrustedExecution','TXT Authenticated Code Module revision.',[],{ro:1});
add('SEAM_Support','Enumeration','Enabled','SEAM Support','SEAM支持','./Advanced/MiscConfig/TrustedExecution','SEAM support for SGX multi-package attestation.',['Enabled','Disabled']);
add('PECI_Override','Enumeration','Disabled','PECI Override','PECI覆盖','./Advanced/MiscConfig/TrustedExecution','PECI override for debug and thermal interface control.',['Enabled','Disabled']);

// === BootOptions (8) ===
add('BootMode','Enumeration','UEFI','Boot Mode','启动模式','./BootOptions','System boot mode. UEFI with GPT; Legacy with MBR.',['UEFI','Legacy'],{rb:1});
add('SecureBoot','Enumeration','Enabled','Secure Boot','安全启动','./BootOptions','Secure Boot verifies boot loader and OS digital signatures.',['Enabled','Disabled'],{rb:1});
add('FastBoot','Enumeration','Enabled','Fast Boot','快速启动','./BootOptions','Minimize POST time by skipping certain hardware init tests.',['Enabled','Disabled']);
add('QuietBoot','Enumeration','Enabled','Quiet Boot','静默启动','./BootOptions','Show OEM logo instead of POST diagnostic messages during boot.',['Enabled','Disabled']);
add('BootRetry','Enumeration','Enabled','Boot Retry','启动重试','./BootOptions','Retry boot from next device in boot order on boot failure.',['Enabled','Disabled']);
add('NumLockState','Enumeration','On','NumLock State','NumLock','./BootOptions','Keyboard NumLock state at system boot completion.',['On','Off']);
add('POSTReport','Enumeration','4s','POST Report Timeout (s)','POST报告超时','./BootOptions','POST report display timeout. NoLimit waits for user keypress.',['0','4','8','12','NoLimit']);
add('AddOnROM_Display','Enumeration','KeepCurrent','Add-On ROM Display','附加ROM显示','./BootOptions','Add-on card Option ROM display mode during POST diagnostics.',['Keep Current','Force BIOS']);

// === BootDeviceOrder (5) ===
add('BootOption1','Enumeration','NVMe SSD 0','Boot Option #1','启动选项1','./BootOptions/BootDeviceOrder','Primary boot device selection in boot order.',['NVMe SSD 0','NVMe SSD 1','SATA HDD','USB Drive','PXE Network','Disabled']);
add('BootOption2','Enumeration','NVMe SSD 1','Boot Option #2','启动选项2','./BootOptions/BootDeviceOrder','Secondary boot device selection in boot order.',['NVMe SSD 0','NVMe SSD 1','SATA HDD','USB Drive','PXE Network','Disabled']);
add('BootOption3','Enumeration','USB Drive','Boot Option #3','启动选项3','./BootOptions/BootDeviceOrder','Third boot device selection in boot order.',['NVMe SSD 0','NVMe SSD 1','SATA HDD','USB Drive','PXE Network','Disabled']);
add('BootOption4','Enumeration','PXE Network','Boot Option #4','启动选项4','./BootOptions/BootDeviceOrder','Fourth boot device selection in boot order.',['NVMe SSD 0','NVMe SSD 1','SATA HDD','USB Drive','PXE Network','Disabled']);
add('BootOption5','Enumeration','Disabled','Boot Option #5','启动选项5','./BootOptions/BootDeviceOrder','Fifth boot device selection in boot order.',['NVMe SSD 0','NVMe SSD 1','SATA HDD','USB Drive','PXE Network','Disabled']);

// === BootPolicy (5) ===
add('BootOrderPolicy','Enumeration','Retry Indefinitely','Boot Order Policy','启动顺序策略','./BootOptions/BootPolicy','Retry policy on boot failure. RetryIndef keeps trying each device.',['Retry Indefinitely','Try Once Then Next','Reset']);
add('UEFI_OptimizedBoot','Enumeration','Enabled','UEFI Optimized Boot','UEFI优化启动','./BootOptions/BootPolicy','UEFI optimized boot skips unnecessary legacy device init.',['Enabled','Disabled']);
add('UEFI_BootMenu','Enumeration','Enabled','F12 Boot Menu','F12启动菜单','./BootOptions/BootPolicy','F12 one-time boot menu for ad-hoc device selection.',['Enabled','Disabled']);
add('InvalidBootRetry','Enumeration','3','Invalid Boot Retry','失败重试次数','./BootOptions/BootPolicy','Maximum retry attempts when selected boot device is invalid.',['0','1','2','3','5','Unlimited']);
add('Timeout_BootMenu','Integer',5,'Boot Menu Timeout (s)','启动菜单超时','./BootOptions/BootPolicy','Boot menu display timeout before automatic boot proceeds.',[],{lb:0,ub:60,st:1});

// === BBS_Priority (5) ===
add('BBS_HDD_Priority','Enumeration','Normal','HDD BBS Priority','HDD优先级','./BootOptions/BBS_Priority','HDD BBS priority for legacy BIOS boot specification ordering.',['Normal','High','Low']);
add('BBS_NIC_Priority','Enumeration','Normal','NIC BBS Priority','网卡优先级','./BootOptions/BBS_Priority','NIC BBS priority for legacy BIOS boot specification ordering.',['Normal','High','Low']);
add('BBS_USB_Priority','Enumeration','Normal','USB BBS Priority','USB优先级','./BootOptions/BBS_Priority','USB BBS priority for legacy BIOS boot specification ordering.',['Normal','High','Low']);
add('BBS_Wait_Time','Integer',0,'BBS Wait Time (s)','BBS等待时间','./BootOptions/BBS_Priority','BBS device initialization wait time before enumeration.',[],{lb:0,ub:30,st:1});
add('BBS_RetryCount','Integer',3,'BBS Retry Count','BBS重试次数','./BootOptions/BBS_Priority','BBS boot retry count before falling through to next device.',[],{lb:0,ub:10,st:1});

// === Security (4) ===
add('AdminPassword','Password','','Administrator Password','管理员密码','./Security','BIOS administrator password for full setup access. Redfish unavailable for security.',[],{sr:false});
add('UserPassword','Password','','User Password','用户密码','./Security','BIOS user password for limited boot-time access. Redfish unavailable for security.',[],{sr:false});
add('PasswordMinLength','Integer',8,'Min Password Length','密码最小长度','./Security','Minimum length requirement for BIOS passwords. Not manageable via Redfish.',[],{lb:4,ub:32,st:1,sr:false});
add('PasswordOnBoot','Enumeration','Disabled','Password on Boot','开机密码','./Security','Require password entry on every system boot. Not manageable via Redfish.',['Enabled','Disabled'],{sr:false});

// === TPM_Config (5) ===
add('TPMSupport','Enumeration','Enabled','TPM Support','TPM支持','./Security/TPM_Config','Trusted Platform Module for secure key storage and attestation.',['Enabled','Disabled'],{rb:1});
add('TPMVersion','Enumeration','TPM 2.0','TPM Version','TPM版本','./Security/TPM_Config','TPM standard version. TPM 2.0 required for Windows 11.',['TPM 2.0','TPM 1.2'],{rb:1});
add('TPM_ActivePCRs','Enumeration','SHA256','TPM Active PCRs','活动PCRs','./Security/TPM_Config','Active PCR bank selection for TPM measurement algorithms.',['SHA1','SHA256']);
add('TPM_PPI_Disable','Enumeration','Disabled','TPM PPI Disable','禁用PPI','./Security/TPM_Config','Physical Presence Interface disable to bypass confirmation.',['Enabled','Disabled']);
add('TPM_Clear','Enumeration','No','Clear TPM','清除TPM','./Security/TPM_Config','Clear TPM ownership and keys. Warning: encrypted data lost. Redfish unavailable for security.',['No','Yes'],{ro:1,sr:false});

// === SecureBootConfig (4) ===
add('SecureBootState','Enumeration','Enabled','Secure Boot State','安全启动状态','./Security/SecureBootConfig','Secure Boot enforces signature verification of boot loaders.',['Enabled','Disabled']);
add('SecureBootMode','Enumeration','Standard','Secure Boot Mode','安全启动模式','./Security/SecureBootConfig','Standard uses built-in keys; Custom allows user key enrollment.',['Standard','Custom']);
add('KeyManagement','Enumeration','Default','Key Management','密钥管理','./Security/SecureBootConfig','Secure Boot key management for PK, KEK, db, and dbx.',['Default','Custom','Factory Restore']);
add('RestoreDBDefaults','Enumeration','No','Restore DB Defaults','恢复DB默认值','./Security/SecureBootConfig','Restore Secure Boot signature databases to factory defaults. Redfish unavailable for security.',['No','Yes'],{sr:false});

// === IntelSGX (4) ===
add('SGX_Support','Enumeration','Enabled','Intel SGX','SGX支持','./Security/IntelSGX','Intel Software Guard Extensions for hardware-isolated enclaves.',['Enabled','Disabled'],{sc:'定制',rb:1});
add('SGX_EPC_Size','Enumeration','Auto','SGX EPC Size','EPC大小','./Security/IntelSGX','Enclave Page Cache size for SGX secure memory allocation.',['Auto','64 MB','128 MB','256 MB','512 MB'],{sc:'定制'});
add('SGX_OwnerEpoch','Enumeration','Enabled','SGX Owner Epoch','Owner Epoch','./Security/IntelSGX','SGX Owner Epoch for enclave version control.',['Enabled','Disabled'],{sc:'定制'});
add('SGX_LaunchControl','Enumeration','Unlocked','SGX Launch Control','启动控制','./Security/IntelSGX','SGX Launch Control for enclave signing policy.',['Unlocked','Locked'],{sc:'定制'});

// === IntelTXT (3) ===
add('TXT_Support','Enumeration','Disabled','Intel TXT','TXT支持','./Security/IntelTXT','Intel Trusted Execution Technology for measured launch.',['Enabled','Disabled'],{sc:'定制',rb:1});
add('TXT_SMX_Enable','Enumeration','Enabled','TXT SMX','TXT SMX','./Security/IntelTXT','SMX requirement enforcement for Intel TXT measured launch.',['Enabled','Disabled']);
add('VTd_On_TXT','Enumeration','Enabled','VT-d under TXT','TXT下VT-d','./Security/IntelTXT','VT-d enablement under TXT measured environment for I/O protection.',['Enabled','Disabled']);

// === IntelTME (3) ===
add('TME_Enable','Enumeration','Enabled','Total Memory Encryption','TME加密','./Security/IntelTME','Total Memory Encryption for full physical memory encryption.',['Enabled','Disabled'],{sc:'定制',rb:1});
add('MKTME_Enable','Enumeration','Disabled','Multi-Key TME','多密钥TME','./Security/IntelTME','Multi-Key TME for per-VM memory encryption isolation.',['Enabled','Disabled'],{sc:'定制'});
add('TME_Bypass','Enumeration','Disabled','TME Bypass','TME绕过','./Security/IntelTME','TME bypass mode for DMA device access to encrypted memory.',['Enabled','Disabled']);

// === SecureErase (4) ===
add('NVMe_SecureErase','Enumeration','No','NVMe Secure Erase','NVMe安全擦除','./Security/SecureErase','NVMe secure erase to cryptographically sanitize the drive. Redfish unavailable for security.',['No','Yes'],{ro:1,sr:false});
add('SATA_SecureErase','Enumeration','No','SATA Secure Erase','SATA安全擦除','./Security/SecureErase','SATA secure erase using ATA Security Erase Unit command. Redfish unavailable for security.',['No','Yes'],{ro:1,sr:false});
add('HDD_Pwd_FreezeLock','Enumeration','Enabled','HDD Password Freeze Lock','硬盘密码冻结锁','./Security/SecureErase','Freeze lock HDD password to prevent runtime modification. Not manageable via Redfish.',['Enabled','Disabled'],{sr:false});
add('BIOS_Rollback_Prevent','Enumeration','Enabled','BIOS Rollback Prevention','BIOS回滚防护','./Security/SecureErase','Prevent downgrade to older BIOS firmware versions. Not manageable via Redfish.',['Enabled','Disabled'],{sr:false});

// === ServerManagement (5) ===
add('BIOSUpdateLock','Enumeration','Disabled','BIOS Update Lock','BIOS更新锁','./ServerManagement','Prevent unauthorized BIOS firmware updates. Not manageable via Redfish.',['Enabled','Disabled'],{sr:false});
add('WatchdogTimer','Enumeration','Enabled','Watchdog Timer','看门狗','./ServerManagement','Watchdog timer for automatic system recovery on hang.',['Enabled','Disabled']);
add('WatchdogTimeout','Integer',5,'Watchdog Timeout (min)','看门狗超时','./ServerManagement','Watchdog timer timeout in minutes before automatic reset.',[],{lb:1,ub:60,st:1});
add('RestoreDefaults','Enumeration','None','Restore Defaults','恢复出厂设置','./ServerManagement','Restore all BIOS settings to factory default values. Not manageable via Redfish.',['None','Restore'],{sr:false});
add('DumpFullMemory','Enumeration','Disabled','Full Memory Dump','全内存转储','./ServerManagement','Enable full physical memory dump on crash for debugging.',['Enabled','Disabled']);

// === BMC_Network (9) ===
add('BMC_IPSource','Enumeration','DHCP','BMC IP Source','BMC IP来源','./ServerManagement/BMC_Network','BMC IP source. DHCP automatic; Static manual configuration.',['DHCP','Static']);
add('BMC_IPAddress','String','0.0.0.0','BMC IP Address','BMC IP地址','./ServerManagement/BMC_Network','BMC static IP address for management access.',[],{mn:7,mx:15});
add('BMC_SubnetMask','String','255.255.255.0','BMC Subnet Mask','BMC子网掩码','./ServerManagement/BMC_Network','BMC subnet mask for management network configuration.',[],{mn:7,mx:15});
add('BMC_Gateway','String','0.0.0.0','BMC Gateway','BMC网关','./ServerManagement/BMC_Network','BMC default gateway IP for management network routing.',[],{mn:7,mx:15});
add('BMC_VLAN_Enable','Enumeration','Disabled','BMC VLAN Support','BMC VLAN','./ServerManagement/BMC_Network','BMC VLAN tagging for management traffic isolation.',['Enabled','Disabled']);
add('BMC_VLAN_ID','Integer',0,'BMC VLAN ID','BMC VLAN ID','./ServerManagement/BMC_Network','BMC VLAN ID 0-4095 for management network traffic.',[],{lb:0,ub:4095,st:1});
add('BMC_DedicatedNIC','Enumeration','Enabled','BMC Dedicated NIC','专用网口','./ServerManagement/BMC_Network','BMC dedicated management NIC port enable.',['Enabled','Disabled']);
add('BMC_SharedNIC','Enumeration','Enabled','BMC Shared NIC','共享网口','./ServerManagement/BMC_Network','BMC shared NIC for management over data network ports.',['Enabled','Disabled']);
add('BMC_NCSI_Mode','Enumeration','Auto Negotiate','BMC NCSI Mode','NCSI模式','./ServerManagement/BMC_Network','BMC NCSI link negotiation for sideband management.',['Auto Negotiate','Force 100M','Force 1000M']);

// === EventLog (6) ===
add('SEL_LogFullPolicy','Enumeration','Overwrite','SEL Full Policy','SEL满策略','./ServerManagement/EventLog','SEL full behavior. Overwrite oldest entries or stop logging.',['Overwrite','Stop Logging']);
add('SEL_LogBootEvents','Enumeration','Enabled','Log Boot Events','记录启动事件','./ServerManagement/EventLog','Log system boot events to the System Event Log.',['Enabled','Disabled']);
add('SEL_LogECCEvents','Enumeration','Enabled','Log ECC Events','记录ECC事件','./ServerManagement/EventLog','Log ECC memory correction events to the System Event Log.',['Enabled','Disabled']);
add('SEL_LogPCIeEvents','Enumeration','Enabled','Log PCIe Events','记录PCIe事件','./ServerManagement/EventLog','Log PCIe error events to the System Event Log.',['Enabled','Disabled']);
add('SEL_LogThermalEvents','Enumeration','Enabled','Log Thermal Events','记录散热事件','./ServerManagement/EventLog','Log thermal threshold events to the System Event Log.',['Enabled','Disabled']);
add('SEL_LogPowerEvents','Enumeration','Enabled','Log Power Events','记录电源事件','./ServerManagement/EventLog','Log power-related events to the System Event Log.',['Enabled','Disabled']);

// === SystemInfo (5) ===
add('SysContact','String','','System Contact','联系人','./ServerManagement/SystemInfo','System administrator contact information for data center.',[],{mx:128});
add('SysLocation','String','','System Location','系统位置','./ServerManagement/SystemInfo','Physical location of this server in the data center.',[],{mx:128});
add('SysSerialNumber','String','SN000000','System Serial Number','序列号','./ServerManagement/SystemInfo','System serial number for warranty and support.',[],{ro:1,sr:false});
add('SysPartNumber','String','PN000000','System Part Number','部件号','./ServerManagement/SystemInfo','System part number for hardware component identification.',[],{ro:1,sr:false});
add('SysSKU','String','','System SKU','SKU编号','./ServerManagement/SystemInfo','System SKU number for configuration and inventory tracking.',[],{ro:1,sr:false});

// === PowerRestore (3) ===
add('PowerRestorePolicy','Enumeration','Last State','Power Restore Policy','电源恢复策略','./ServerManagement/PowerRestore','Behavior when AC power is restored after unexpected loss.',['Always On','Always Off','Last State']);
add('PowerRestoreDelay','Integer',0,'Power Restore Delay (s)','恢复延迟','./ServerManagement/PowerRestore','Delay before auto-power-on after AC power restoration.',[],{lb:0,ub:300,st:5,sc:'定制'});
add('PowerButtonBehavior','Enumeration','Instant Off','Power Button Behavior','电源按钮','./ServerManagement/PowerRestore','Power button press behavior for graceful or immediate shutdown.',['Instant Off','Delay 4 Seconds']);

// === LDAP_Config (5) ===
add('LDAP_Enable','Enumeration','Disabled','LDAP Authentication','LDAP认证','./Security/LDAP_Config','LDAP authentication for centralized BMC user management.',['Enabled','Disabled']);
add('LDAP_ServerIP','String','','LDAP Server IP','服务器IP','./Security/LDAP_Config','LDAP directory server IP address for authentication.',[],{mn:7,mx:15});
add('LDAP_Port','Integer',389,'LDAP Port','LDAP端口','./Security/LDAP_Config','LDAP directory service port number.',[],{lb:1,ub:65535,st:1});
add('LDAP_DN','String','','LDAP Base DN','基准DN','./Security/LDAP_Config','LDAP Base Distinguished Name for user search.',[],{mx:256});
add('LDAP_GroupFilter','String','','LDAP Group Filter','组过滤','./Security/LDAP_Config','LDAP group filter for role-based access control.',[],{mx:128});

// Write
for (const a of attrs) out += A(...a) + ',\n';
out += '    ]\n};\n\n';
out += `function buildMenus(profile){for(const m of MENUS)profile.menuMap[m.MenuName]=createMenu(m);}
function buildAttrs(profile,defs){for(const d of defs){const a=createAttribute({AttributeName:d.name,Type:d.type,DefaultValue:d.def,DisplayName:d.disp,displayNameZh:d.dispZh??null,HelpText:d.help??'',helpTextZh:null,MenuPath:d.menu,ReadOnly:d.ro??false,Immutable:false,ResetRequired:d.rb??false,SupportsRedfish:d.sr!==undefined?d.sr:true,AttributeScope:d.sc??'通用',Platforms:d.pl??[],Value:d.val??[],LowerBound:d.lb??null,UpperBound:d.ub??null,ScalarIncrement:d.st??null,MinLength:d.mn??null,MaxLength:d.mx??null,DisplayOrder:d.order??0});profile.attrMap[a.attributeName]=a;}}
function buildModelProfile(model){const p=createSystemProfile(model.productName,model.systemId,model.firmwareVersion);buildMenus(p);buildAttrs(p,model.attrs);return p;}
const MODEL_2288HV7=DEMO_MODEL;`;

fs.writeFileSync(f, out, 'utf8');
console.log('Wrote', attrs.length, 'attrs with help text');

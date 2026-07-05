#!/usr/bin/env node
/**
 * 批量生成 BIOS Registry JSON 文件
 * 基于 registry.json 格式，生成 10 个不同机型的配置文件（300-1000 项属性）
 */

const fs = require('fs');
const path = require('path');

// ======================== 机型定义 ========================

const SYSTEMS = [
    { id: 'SR620-G6',     name: 'Lenovo SR620 G6',       attrs: 350,  cpu: 'Intel Xeon 4th Gen',  mem: 'DDR5', pcie: '5.0', form: '1U' },
    { id: 'SR630-V3',     name: 'Lenovo SR630 V3',       attrs: 420,  cpu: 'Intel Xeon 4th Gen',  mem: 'DDR5', pcie: '5.0', form: '1U' },
    { id: 'SR650-V3',     name: 'Lenovo SR650 V3',       attrs: 520,  cpu: 'Intel Xeon 4th Gen',  mem: 'DDR5', pcie: '5.0', form: '2U' },
    { id: 'SR850-V3',     name: 'Lenovo SR850 V3',       attrs: 650,  cpu: 'Intel Xeon 4th Gen',  mem: 'DDR5', pcie: '5.0', form: '2U4P' },
    { id: 'RD650-G2',     name: 'Inspur RD650 G2',       attrs: 380,  cpu: 'Intel Xeon 3rd Gen',  mem: 'DDR4', pcie: '4.0', form: '2U' },
    { id: 'NF5280M7',     name: 'Inspur NF5280M7',       attrs: 480,  cpu: 'Intel Xeon 4th Gen',  mem: 'DDR5', pcie: '5.0', form: '2U' },
    { id: 'R750xs-G3',    name: 'Dell R750xs G3',        attrs: 560,  cpu: 'Intel Xeon 4th Gen',  mem: 'DDR5', pcie: '5.0', form: '2U' },
    { id: 'R660-G5',      name: 'Dell R660 G5',          attrs: 440,  cpu: 'Intel Xeon 4th Gen',  mem: 'DDR5', pcie: '5.0', form: '1U' },
    { id: 'TaiShan-2280M', name: 'Huawei TaiShan 2280M', attrs: 720,  cpu: 'Kunpeng 920',         mem: 'DDR4', pcie: '3.0', form: '2U' },
    { id: 'PD5120-G5',    name: 'H3C PD5120 G5',         attrs: 900,  cpu: 'Intel Xeon 4th Gen',  mem: 'DDR5', pcie: '5.0', form: '2U' },
];

// ======================== 菜单路径库 ========================

const MENU_PATHS = {
    core: [
        './Main',
        './Main/System Information',
        './Main/System Date',
        './Main/System Time',
    ],
    advanced: [
        './Advanced',
        './Advanced/Processor Configuration',
        './Advanced/Processor Configuration/CPU Core Control',
        './Advanced/Processor Configuration/Intel Virtualization Technology',
        './Advanced/Processor Configuration/Hyper-Threading',
        './Advanced/Processor Configuration/C-States',
        './Advanced/Processor Configuration/P-States',
        './Advanced/Processor Configuration/Turbo Boost',
        './Advanced/Processor Configuration/Power Management',
        './Advanced/Memory Configuration',
        './Advanced/Memory Configuration/Speed',
        './Advanced/Memory Configuration/RAS Mode',
        './Advanced/Memory Configuration/Address interleaving',
        './Advanced/Memory Configuration/Mirror Mode',
        './Advanced/Memory Configuration/Sparing Mode',
        './Advanced/Storage Configuration',
        './Advanced/Storage Configuration/SATA Configuration',
        './Advanced/Storage Configuration/NVMe Configuration',
        './Advanced/Storage Configuration/RAID Configuration',
        './Advanced/Storage Configuration/Boot Mode',
        './Advanced/Network Configuration',
        './Advanced/Network Configuration/BMC Network',
        './Advanced/Network Configuration/LOM Configuration',
        './Advanced/Network Configuration/LOM1',
        './Advanced/Network Configuration/LOM2',
        './Advanced/PCIe Configuration',
        './Advanced/PCIe Configuration/PCIE Speed',
        './Advanced/PCIe Configuration/SR-IOV',
        './Advanced/PCIe Configuration/AER',
        './Advanced/PCIe Configuration/ACS',
        './Advanced/Power Management',
        './Advanced/Power Management/Power Profile',
        './Advanced/Power Management/Power Capping',
        './Advanced/Power Management/Redundant Power',
        './Advanced/ACPI Configuration',
        './Advanced/ACPI Configuration/ACPI Version',
        './Advanced/ACPI Configuration/Sleep State',
        './Advanced/USB Configuration',
        './Advanced/USB Configuration/USB Ports',
        './Advanced/USB Configuration/USB Boot',
        './Advanced/Serial Port Configuration',
        './Advanced/Serial Port Configuration/COM1',
        './Advanced/Serial Port Configuration/COM2',
        './Advanced/Serial Port Configuration/BMC Serial',
        './Advanced/Fan Control',
        './Advanced/Fan Control/Fan Profile',
        './Advanced/Fan Control/Fan Speed',
        './Advanced/Event Log',
        './Advanced/Redfish Configuration',
        './Advanced/Redfish Configuration/Redfish Service',
        './Advanced/Redfish Configuration/Host Interface',
    ],
    security: [
        './Security',
        './Security/Trusted Computing',
        './Security/Trusted Computing/TPM Support',
        './Security/Trusted Computing/TPM State',
        './Security/Trusted Computing/TPM Version',
        './Security/Trusted Computing/TPM Interface',
        './Security/Secure Boot',
        './Security/Secure Boot/Secure Boot Enable',
        './Security/Secure Boot/Key Management',
        './Security/Secure Boot/DB Signature',
        './Security/Secure Boot/KEK Signature',
        './Security/Password Configuration',
        './Security/Password Configuration/Admin Password',
        './Security/Password Configuration/Power-On Password',
        './Security/Password Configuration/Password Policy',
        './Security/Chassis Intrusion',
        './Security/Chassis Intrusion/Intrusion Detection',
        './Security/Chassis Intrusion/Intrusion Action',
        './Security/BIOS Security',
        './Security/BIOS Security/BIOS Lock',
        './Security/BIOS Security/Flash Protection',
        './Security/Hardware Security',
        './Security/Hardware Security/Intel TXT',
        './Security/Hardware Security/Intel SGX',
        './Security/Hardware Security/Secure Memory Encryption',
        './Security/Hardware Security/Transparent SME',
    ],
    boot: [
        './Boot',
        './Boot/Boot Priority',
        './Boot/Boot Priority/Boot Order',
        './Boot/Boot Priority/Boot Mode',
        './Boot/Boot Priority/Network Boot',
        './Boot/Boot Options',
        './Boot/Boot Options/Quick Boot',
        './Boot/Boot Options/Boot Logo',
        './Boot/Boot Options/BootTimeout',
        './Boot/Boot Options/Retry Boot',
        './Boot/Boot Options/PXE Boot',
        './Boot/Boot Options/USB Boot',
        './Boot/Boot Options/HDD Boot',
        './Boot/Boot Options/CD/DVD Boot',
        './Boot/Boot Options/Floppy Boot',
        './Boot/CSM Configuration',
        './Boot/CSM Configuration/CSM Enable',
        './Boot/CSM Configuration/Video Option',
        './Boot/CSM Configuration/Storage Option',
        './Boot/CSM Configuration/Other PCI Device',
    ],
    server: [
        './Server Management',
        './Server Management/BMC Configuration',
        './Server Management/BMC Configuration/BMC VLAN',
        './Server Management/BMC Configuration/BMC IP',
        './Server Management/BMC Configuration/BMC NetMode',
        './Server Management/BMC Configuration/BMC User',
        './Server Management/Power Restore',
        './Server Management/Power Restore/Power Policy',
        './Server Management/Power Restore/Last State',
        './Server Management/AC Power Recovery',
        './Server Management/System Event Log',
        './Server Management/System Event Log/SEL Policy',
        './Server Management/System Event Log/SEL Erase',
        './Server Management/FW Update',
        './Server Management/FW Update/BIOS Update',
        './Server Management/FW Update/BMC Update',
        './Server Management/FW Update/NIC Update',
        './Server Management/Diagnostic',
        './Server Management/Diagnostic/POST Code',
        './Server Management/Diagnostic/Watchdog Timer',
        './Server Management/OS Watchdog',
    ],
    oem: [
        './OEM',
        './OEM/Memory RAS',
        './OEM/Memory RAS/SDDC',
        './OEM/Memory RAS/ADDDC',
        './OEM/Memory RAS/Page Retire',
        './OEM/Memory RAS/Line Sparing',
        './OEM/Power Budget',
        './OEM/Power Budget/Power Cap',
        './OEM/Power Budget/Power Floor',
        './OEM/Power Budget/Thermal Profile',
        './OEM/System Tuning',
        './OEM/System Tuning/Performance Mode',
        './OEM/System Tuning/Efficiency Mode',
        './OEM/System Tuning/Custom Mode',
        './OEM/Customer Config',
        './OEM/Customer Config/Feature A',
        './OEM/Customer Config/Feature B',
        './OEM/Customer Config/Feature C',
    ],
};

// ======================== 属性模板库 ========================

const ENUM_TEMPLATES = [
    { name: 'State',        values: ['Disabled', 'Enabled'],              default: 'Enabled' },
    { name: 'Mode',         values: ['Auto', 'Manual', 'Disabled'],       default: 'Auto' },
    { name: 'Speed',        values: ['Auto', 'Low', 'Medium', 'High'],   default: 'Auto' },
    { name: 'Profile',      values: ['Performance', 'Balanced', 'Power Saver', 'Custom'], default: 'Balanced' },
    { name: 'Policy',       values: ['Restore Last', 'Always On', 'Always Off'],          default: 'Restore Last' },
    { name: 'Option',       values: ['Option1', 'Option2', 'Option3'],    default: 'Option1' },
    { name: 'Control',      values: ['Disabled', 'Enabled', 'Auto'],      default: 'Auto' },
    { name: 'Select',       values: ['Manual', 'Auto'],                    default: 'Auto' },
    { name: 'Level',        values: ['Low', 'Medium', 'High', 'Maximum'], default: 'Medium' },
    { name: 'Action',       values: ['None', 'Reset', 'Power Cycle', 'Power Off'], default: 'None' },
    { name: 'Type',         values: ['Type A', 'Type B', 'Type C'],       default: 'Type A' },
    { name: 'Width',        values: ['7', '8'],                           default: '8' },
    { name: 'StopBits',     values: ['1', '1.5', '2'],                    default: '1' },
    { name: 'Parity',       values: ['None', 'Even', 'Odd', 'Mark', 'Space'], default: 'None' },
    { name: 'BaudRate',     values: ['9600', '19200', '38400', '57600', '115200'], default: '115200' },
    { name: 'TerminalType', values: ['VT100', 'VT100Plus', 'VT-UTF8', 'ANSI'],     default: 'VT-UTF8' },
    { name: 'MemorySpeed',  values: ['DDR4-2400', 'DDR4-2666', 'DDR4-2933', 'DDR4-3200', 'DDR5-4800', 'DDR5-5200', 'DDR5-5600'], default: 'Auto' },
    { name: 'RASMode',      values: ['Independent', 'Mirroring', 'Sparing', 'Lockstep'], default: 'Independent' },
    { name: 'PCIESpeed',    values: ['Auto', 'Gen1', 'Gen2', 'Gen3', 'Gen4', 'Gen5'], default: 'Auto' },
    { name: 'SATA_Mode',    values: ['AHCI', 'RAID', 'Disabled'],         default: 'AHCI' },
    { name: 'BootMode',     values: ['UEFI', 'Legacy', 'Dual'],           default: 'UEFI' },
    { name: 'SleepState',   values: ['S0', 'S3', 'S4', 'S5'],            default: 'S5' },
    { name: 'USBPort',      values: ['Enabled', 'Disabled'],              default: 'Enabled' },
    { name: 'ACPIVer',      values: ['ACPI 5.0', 'ACPI 6.0', 'ACPI 6.4'], default: 'ACPI 6.4' },
    { name: 'TPMVer',       values: ['TPM 1.2', 'TPM 2.0', 'Auto'],      default: 'TPM 2.0' },
    { name: 'TPMInterface', values: ['CRB', 'TIS'],                       default: 'CRB' },
    { name: 'CSMOption',    values: ['Enabled', 'Disabled'],              default: 'Disabled' },
    { name: 'VideoOption',  values: ['Legacy OpROM', 'UEFI OpROM', 'Both'], default: 'UEFI OpROM' },
    { name: 'NetworkBoot',  values: ['PXE', 'iSCSI', 'HTTP', 'Disabled'], default: 'PXE' },
    { name: 'FanProfile',   values: ['Standard', 'Full Speed', 'Quiet', 'Optimal'], default: 'Standard' },
    { name: 'PowerProfile', values: ['Maximum Performance', 'Balanced', 'Power Saver', 'Custom'], default: 'Balanced' },
    { name: 'SEL_Erase',    values: ['On Full', 'Rotate', 'Disabled'],    default: 'On Full' },
    { name: 'PostCode',     values: ['Disabled', 'Enabled'],              default: 'Disabled' },
    { name: 'Watchdog',     values: ['Disabled', 'Enabled'],              default: 'Disabled' },
    { name: 'SecurityLevel', values: ['User', 'Admin', 'Custom'],         default: 'Admin' },
    { name: 'LogLevel',     values: ['None', 'Error', 'Warning', 'Info', 'Debug'], default: 'Info' },
];

const INTEGER_TEMPLATES = [
    { name: 'Timeout',        unit: 'sec',   min: 0,   max: 300,   default: 30,    desc: 'Timeout in seconds' },
    { name: 'RetryCount',     unit: '',      min: 0,   max: 10,    default: 3,     desc: 'Number of retry attempts' },
    { name: 'PowerCap',       unit: 'W',     min: 100, max: 1200,  default: 800,   desc: 'Power cap limit in watts' },
    { name: 'FanSpeed',       unit: '%',     min: 0,   max: 100,   default: 50,    desc: 'Fan speed percentage' },
    { name: 'Voltage',        unit: 'mV',    min: 0,   max: 1500,  default: 1100,  desc: 'Voltage in millivolts' },
    { name: 'Temperature',    unit: '°C',    min: 0,   max: 105,   default: 85,    desc: 'Temperature threshold' },
    { name: 'MemorySize',     unit: 'MB',    min: 0,   max: 131072, default: 32768, desc: 'Memory size in MB' },
    { name: 'PCIESpeed',      unit: 'GT/s',  min: 1,   max: 32,    default: 16,    desc: 'PCIe link speed' },
    { name: 'CoreCount',      unit: '',      min: 0,   max: 128,   default: 0,     desc: 'Number of cores (0=Auto)' },
    { name: 'ThreadCount',    unit: '',      min: 0,   max: 256,   default: 0,     desc: 'Number of threads (0=Auto)' },
    { name: 'CacheSize',      unit: 'MB',    min: 0,   max: 256,   default: 0,     desc: 'Cache size override (0=Auto)' },
    { name: 'NUMANodes',      unit: '',      min: 1,   max: 8,     default: 1,     desc: 'Number of NUMA nodes' },
    { name: 'InterleaveSize', unit: 'KB',    min: 4,   max: 1024,  default: 64,    desc: 'Memory interleave size' },
];

const STRING_TEMPLATES = [
    { name: 'SerialNumber',   maxLen: 64,  default: '',       desc: 'System serial number' },
    { name: 'AssetTag',       maxLen: 64,  default: '',       desc: 'Asset tag' },
    { name: 'ProductName',    maxLen: 128, default: '',       desc: 'Product name' },
    { name: 'BIOSVersion',    maxLen: 64,  default: '',       desc: 'BIOS version string' },
    { name: 'BuildDate',      maxLen: 32,  default: '',       desc: 'BIOS build date' },
    { name: 'CustomString',   maxLen: 256, default: '',       desc: 'Custom configuration string' },
];

const BOOLEAN_TEMPLATES = [
    { name: 'EnableFeature',  default: true,  desc: 'Enable this feature' },
    { name: 'DebugMode',      default: false, desc: 'Enable debug mode' },
    { name: 'VerboseOutput',  default: false, desc: 'Enable verbose output' },
    { name: 'AutoRecovery',   default: true,  desc: 'Enable automatic recovery' },
    { name: 'SecureChannel',  default: true,  desc: 'Enable secure channel' },
    { name: 'WatchdogTimer',  default: false, desc: 'Enable watchdog timer' },
    { name: 'EventLogging',   default: true,  desc: 'Enable event logging' },
    { name: 'PowerOnSelfTest', default: true, desc: 'Enable POST' },
];

const PASSWORD_TEMPLATES = [
    { name: 'AdminPassword',    maxLen: 20, desc: 'Administrator password' },
    { name: 'PowerOnPassword',  maxLen: 20, desc: 'Power-on password' },
    { name: 'SetupPassword',    maxLen: 20, desc: 'Setup password' },
];

// ======================== 工具函数 ========================

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateAttributeName(prefix, idx) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let suffix = '';
    for (let i = 0; i < 6; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
    return prefix + '_' + suffix;
}

function generateEnumValue(name, template, idx, menuPath) {
    // 根据菜单路径生成有意义的 DisplayName
    const pathParts = menuPath.replace('./', '').split('/');
    const section = pathParts[pathParts.length - 1] || 'Setting';
    const displayName = section + ' ' + name.replace(/_/g, ' ');
    const helpText = 'Configure ' + displayName + '. Default: ' + template.default;

    return {
        Immutable: false,
        IsSystemUniqueProperty: Math.random() > 0.8,
        WriteOnly: false,
        GrayOut: Math.random() > 0.9,
        Hidden: Math.random() > 0.95,
        DisplayOrder: idx,
        ValueExpression: null,
        WarningText: Math.random() > 0.9 ? 'Warning: Incorrect settings may cause system instability.' : null,
        AttributeName: generateAttributeName('ENUM', idx),
        MenuPath: menuPath,
        DisplayName: displayName,
        HelpText: helpText,
        UefiNamespaceId: 'x-UEFI-AMI',
        ReadOnly: Math.random() > 0.9,
        ResetRequired: Math.random() > 0.6,
        Type: 'Enumeration',
        Value: template.values.map(v => ({ ValueDisplayName: v, ValueName: v })),
        DefaultValue: template.default,
    };
}

function generateIntValue(template, idx, menuPath) {
    const pathParts = menuPath.replace('./', '').split('/');
    const section = pathParts[pathParts.length - 1] || 'Setting';
    const displayName = section + ' ' + template.name.replace(/_/g, ' ');
    const helpText = template.desc + (template.unit ? ' (' + template.unit + ')' : '') + '. Range: ' + template.min + '-' + template.max;

    return {
        Immutable: false,
        IsSystemUniqueProperty: Math.random() > 0.7,
        WriteOnly: false,
        GrayOut: Math.random() > 0.92,
        Hidden: Math.random() > 0.96,
        DisplayOrder: idx,
        ValueExpression: null,
        WarningText: Math.random() > 0.9 ? 'Warning: Out of range values may cause system instability.' : null,
        AttributeName: generateAttributeName('INT', idx),
        MenuPath: menuPath,
        DisplayName: displayName,
        HelpText: helpText,
        UefiNamespaceId: 'x-UEFI-AMI',
        ReadOnly: Math.random() > 0.85,
        ResetRequired: Math.random() > 0.5,
        Type: 'Integer',
        LowerBound: template.min,
        UpperBound: template.max,
        ScalarIncrement: 1,
        DefaultValue: template.default,
    };
}

function generateStringValue(template, idx, menuPath) {
    const pathParts = menuPath.replace('./', '').split('/');
    const section = pathParts[pathParts.length - 1] || 'Setting';
    const displayName = section + ' ' + template.name.replace(/_/g, ' ');

    return {
        Immutable: false,
        IsSystemUniqueProperty: Math.random() > 0.8,
        WriteOnly: false,
        GrayOut: Math.random() > 0.95,
        Hidden: Math.random() > 0.97,
        DisplayOrder: idx,
        ValueExpression: null,
        WarningText: null,
        AttributeName: generateAttributeName('STR', idx),
        MenuPath: menuPath,
        DisplayName: displayName,
        HelpText: template.desc,
        UefiNamespaceId: 'x-UEFI-AMI',
        ReadOnly: Math.random() > 0.8,
        ResetRequired: Math.random() > 0.3,
        Type: 'String',
        MinLength: 0,
        MaxLength: template.maxLen,
        DefaultValue: template.default,
    };
}

function generateBoolValue(template, idx, menuPath) {
    const pathParts = menuPath.replace('./', '').split('/');
    const section = pathParts[pathParts.length - 1] || 'Setting';
    const displayName = section + ' ' + template.name.replace(/_/g, ' ');

    return {
        Immutable: false,
        IsSystemUniqueProperty: Math.random() > 0.7,
        WriteOnly: false,
        GrayOut: Math.random() > 0.93,
        Hidden: Math.random() > 0.95,
        DisplayOrder: idx,
        ValueExpression: null,
        WarningText: null,
        AttributeName: generateAttributeName('BOOL', idx),
        MenuPath: menuPath,
        DisplayName: displayName,
        HelpText: template.desc,
        UefiNamespaceId: 'x-UEFI-AMI',
        ReadOnly: Math.random() > 0.85,
        ResetRequired: Math.random() > 0.4,
        Type: 'Boolean',
        DefaultValue: template.default,
    };
}

function generatePasswordValue(template, idx, menuPath) {
    return {
        Immutable: false,
        IsSystemUniqueProperty: true,
        WriteOnly: true,
        GrayOut: false,
        Hidden: false,
        DisplayOrder: idx,
        ValueExpression: null,
        WarningText: 'Password must be at least 8 characters.',
        AttributeName: generateAttributeName('PWD', idx),
        MenuPath: menuPath,
        DisplayName: template.name.replace(/_/g, ' '),
        HelpText: template.desc,
        UefiNamespaceId: 'x-UEFI-AMI',
        ReadOnly: false,
        ResetRequired: false,
        Type: 'Password',
        MinLength: 8,
        MaxLength: template.maxLen,
        DefaultValue: '',
    };
}

// ======================== 生成器 ========================

function generateRegistry(system) {
    const allPaths = [
        ...MENU_PATHS.core,
        ...MENU_PATHS.advanced,
        ...MENU_PATHS.security,
        ...MENU_PATHS.boot,
        ...MENU_PATHS.server,
        ...MENU_PATHS.oem,
    ];

    const attributes = [];
    let displayOrder = 1;
    const targetAttrs = system.attrs;

    // 分配属性到菜单路径（按比例分配）
    const pathWeights = {};
    for (const p of allPaths) pathWeights[p] = 1;
    // 核心菜单多分一些
    for (const p of MENU_PATHS.core) pathWeights[p] = 3;
    for (const p of MENU_PATHS.advanced) pathWeights[p] = 4;
    for (const p of MENU_PATHS.security) pathWeights[p] = 2;
    for (const p of MENU_PATHS.boot) pathWeights[p] = 2;
    for (const p of MENU_PATHS.server) pathWeights[p] = 2;
    for (const p of MENU_PATHS.oem) pathWeights[p] = 3;

    const totalWeight = Object.values(pathWeights).reduce((a, b) => a + b, 0);

    // 按权重分配属性数量到各路径
    const pathCounts = {};
    let remaining = targetAttrs;
    const paths = Object.keys(pathWeights);

    for (let i = 0; i < paths.length; i++) {
        const p = paths[i];
        const count = Math.max(1, Math.round((pathWeights[p] / totalWeight) * targetAttrs));
        pathCounts[p] = Math.min(count, remaining);
        remaining -= pathCounts[p];
        if (remaining <= 0) break;
    }

    // 补充剩余
    if (remaining > 0) {
        for (const p of paths) {
            if (remaining <= 0) break;
            pathCounts[p] = (pathCounts[p] || 0) + 1;
            remaining--;
        }
    }

    // 为每个路径生成属性
    for (const menuPath of paths) {
        const count = pathCounts[menuPath] || 0;
        for (let i = 0; i < count; i++) {
            let attr;
            const roll = Math.random();
            if (roll < 0.55) {
                // 55% 枚举
                attr = generateEnumValue(pick(ENUM_TEMPLATES).name, pick(ENUM_TEMPLATES), displayOrder, menuPath);
            } else if (roll < 0.70) {
                // 15% 整数
                attr = generateIntValue(pick(INTEGER_TEMPLATES), displayOrder, menuPath);
            } else if (roll < 0.82) {
                // 12% 字符串
                attr = generateStringValue(pick(STRING_TEMPLATES), displayOrder, menuPath);
            } else if (roll < 0.94) {
                // 12% 布尔
                attr = generateBoolValue(pick(BOOLEAN_TEMPLATES), displayOrder, menuPath);
            } else {
                // 6% 密码
                attr = generatePasswordValue(pick(PASSWORD_TEMPLATES), displayOrder, menuPath);
            }
            attributes.push(attr);
            displayOrder++;
        }
    }

    // 构建 Registry JSON
    return {
        '@odata.type': '#AttributeRegistry.v1_3_1.AttributeRegistry',
        'Description': 'BIOS Attribute Registry for ' + system.name,
        'Id': 'BiosAttributeRegistry_' + system.id + '.en-US.1.0.0',
        'Language': 'en-US',
        'Name': system.id + ' BIOS Attribute Registry',
        'OwningEntity': 'AMI',
        'RegistryVersion': '1.0.0',
        '@odata.context': '/redfish/v1/$metadata#AttributeRegistry.AttributeRegistry',
        '@odata.etag': 'W/"' + Date.now().toString(36) + '"',
        '@odata.id': '/redfish/v1/Registries/BiosAttributeRegistry_' + system.id + '.json',
        'RegistryEntries': {
            'Attributes': attributes,
        },
    };
}

// ======================== 主函数 ========================

function main() {
    const outputDir = path.join(__dirname, '..', 'data', 'registries');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log('生成 10 个机型 BIOS Registry JSON 文件...\n');

    for (const system of SYSTEMS) {
        const registry = generateRegistry(system);
        const filename = system.id.toLowerCase().replace(/[^a-z0-9]/g, '-') + '.json';
        const filepath = path.join(outputDir, filename);

        fs.writeFileSync(filepath, JSON.stringify(registry, null, 2), 'utf-8');

        const attrCount = registry.RegistryEntries.Attributes.length;
        console.log(`  ✅ ${system.name.padEnd(28)} ${String(attrCount).padStart(4)} 项 → ${filename}`);
    }

    console.log(`\n完成！文件输出到: ${outputDir}`);
}

main();

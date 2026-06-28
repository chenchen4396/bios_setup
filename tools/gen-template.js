/**
 * 生成 BIOS 选项导入模板 (Excel 格式)
 * 使用: node gen-template.js [output.xlsx]
 */
const XLSX = require('xlsx');
const path = require('path');

const outFile = process.argv[2] || path.join(__dirname, '..', 'BIOS选项导入模板.xlsx');

const wb = XLSX.utils.book_new();

// ==================== Sheet 1: 菜单结构 ====================
const menuHeader = ['菜单标识', '显示名称', '排序', '菜单元路径', '只读', '灰显', '隐藏'];
const menuSamples = [
    ['Main', 'Main / BIOS Information', 1, './', '否', '否', '否'],
    ['SysProc', 'System / Processor', 2, './System/Processor', '否', '否', '否'],
    ['SysMem', 'System / Memory', 3, './System/Memory', '否', '否', '否'],
    ['Boot', 'Boot Configuration', 4, './Boot', '否', '否', '否'],
    ['Security', 'Security', 5, './Security', '否', '否', '否'],
    ['AdvCPU', 'Advanced / CPU Configuration', 6, './Advanced/CPU', '否', '否', '否'],
    ['Custom', 'Custom Settings', 7, './Custom', '否', '否', '否'],
];
const menuSheet = XLSX.utils.aoa_to_sheet([menuHeader, ...menuSamples]);
menuSheet['!cols'] = menuHeader.map(() => ({ wch: 25 }));
XLSX.utils.book_append_sheet(wb, menuSheet, '菜单结构');

// ==================== Sheet 2: BIOS选项 (主表) ====================
const attrHeader = ['菜单路径', '属性标识', '显示名称', '中文名称', '默认值', '可选值', '来源', '支持Redfish', '平台', '说明'];
const attrSamples = [
    ['./System/Processor', 'IntelHyperThreading', 'Intel Hyper-Threading Technology', 'Intel 超线程技术', 'Enabled', 'Enabled, Disabled', '通用', '是', '', '启用后每个物理核心可同时运行两个逻辑线程'],
    ['./System/Processor', 'ActiveCores', 'Active Processor Cores', '活动处理器核心数', '0', '0 ~ 56 (步进: 1)', '通用', '是', '', '启用核心数，0=全部'],
    ['./System/Processor', 'IntelVT', 'Intel Virtualization Technology', 'Intel 虚拟化技术', 'Enabled', 'Enabled, Disabled', '通用', '是', '', '启用Intel VT-x硬件虚拟化'],
    ['./System/Memory', 'MemSpeed', 'Memory Speed', '内存速率', 'Auto', 'Auto, 4800, 4400, 4000', '通用', '是', '', '设置内存总线速率'],
    ['./System/Memory', 'MemMirrorMode', 'Memory Mirror Mode', '内存镜像模式', 'Disabled', 'Disabled, Enabled, Spare', '通用', '是', '', '内存镜像容错模式，容量减半'],
    ['./Boot', 'BootMode', 'Boot Mode', '启动模式', 'Uefi', 'UEFI Boot Mode, Legacy BIOS Mode', '通用', '是', '', 'UEFI支持GPT和Secure Boot'],
    ['./Security', 'SecureBoot', 'Secure Boot', '安全启动', 'Disabled', 'Enabled, Disabled', '通用', '是', '', '仅允许签名引导程序'],
    ['./Security', 'AdminPassword', 'Administrator Password', '管理员密码', '', '长度: 8 ~ 32', '通用', '是', '', 'BIOS管理员密码，输入即设置'],
    ['./Custom', 'OemFeature', 'OEM Custom Feature', 'OEM自定义特性', 'Disabled', 'Enabled, Disabled', '定制', '否', '2288H V7', '厂商自定义特性说明'],
    ['./Custom', 'OemDebugLevel', 'OEM Debug Level', 'OEM调试级别', '100', '0 ~ 255 (步进: 1)', '定制', '否', '2288H V7', '厂商调试级别设置'],
];
const attrSheet = XLSX.utils.aoa_to_sheet([attrHeader, ...attrSamples]);
attrSheet['!cols'] = attrHeader.map((_, i) => {
    if (i === 0) return { wch: 28 };  // 菜单路径
    if (i === 9) return { wch: 50 };  // 说明
    return { wch: 22 };
});
XLSX.utils.book_append_sheet(wb, attrSheet, 'BIOS选项');

// ==================== Sheet 3: 依赖关系 ====================
const depHeader = ['DependencyFor', 'Type', 'MapFromAttribute', 'MapFromProperty', 'MapFromCondition', 'MapFromValue', 'MapTerms', 'MapToAttribute', 'MapToProperty', 'MapToValue'];
const depSamples = [
    ['SecureBoot', 'Map', 'BootMode', 'CurrentValue', 'EQU', 'LegacyBios', 'AND', 'SecureBoot', 'GrayOut', true],
    ['SriovEnabled', 'Map', 'IntelVTd', 'CurrentValue', 'EQU', 'Disabled', 'AND', 'SriovEnabled', 'GrayOut', true],
];
const depSheet = XLSX.utils.aoa_to_sheet([depHeader, ...depSamples]);
depSheet['!cols'] = depHeader.map(() => ({ wch: 20 }));
XLSX.utils.book_append_sheet(wb, depSheet, '依赖关系');

// ==================== Sheet 4: 支持系统 ====================
const sysHeader = ['ProductName', 'SystemId', 'FirmwareVersion'];
const sysSamples = [['FusionServer 2288H V7', '2288HV7', 'iBMC V678 v3.21']];
const sysSheet = XLSX.utils.aoa_to_sheet([sysHeader, ...sysSamples]);
sysSheet['!cols'] = sysHeader.map(() => ({ wch: 30 }));
XLSX.utils.book_append_sheet(wb, sysSheet, '支持系统');

// 写入文件
XLSX.writeFile(wb, outFile);
console.log('模板已生成: ' + outFile);

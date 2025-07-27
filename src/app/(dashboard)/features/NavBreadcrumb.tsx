"use client"

import React from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator
} from '@/components/ui/breadcrumb';

// 定义面包屑项的类型
type BreadcrumbItemType = {
    href?: string;
    label: string;
};

const NavBreadcrumb = () => {
    const pathname = usePathname();

    // 从路径中生成面包屑导航项
    const generateBreadcrumbItems = (path: string): BreadcrumbItemType[] => {
        // 如果是根路径，只返回Dashboard
        if (path === '/') {
            return [{ href: '/', label: '$' }];
        }

        // 分割路径
        const segments = path.split('/').filter(Boolean);
        
        // 创建面包屑项数组，始终包含Dashboard作为第一项
        const items: BreadcrumbItemType[] = [
            { href: '/', label: '$' }
        ];

        // 为每个路径段生成面包屑项
        let currentPath = '';
        segments.forEach((segment, index) => {
            currentPath += `/${segment}`;
            
            // 格式化标签（将短横线替换为空格，首字母大写）
            const formattedLabel = segment
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            
            // 如果是最后一个段，则不添加href
            if (index === segments.length - 1) {
                items.push({ label: formattedLabel });
            } else {
                items.push({ href: currentPath, label: formattedLabel });
            }
        });

        return items;
    };

    // 生成面包屑项
    const breadcrumbItems = generateBreadcrumbItems(pathname);

    return (
        <Breadcrumb className="hidden md:flex">
            <BreadcrumbList>
                {breadcrumbItems.map((item, index) => (
                    <React.Fragment key={index}>
                        <BreadcrumbItem>
                            {item.href ? (
                                <BreadcrumbLink asChild>
                                    <Link href={item.href}>{item.label}</Link>
                                </BreadcrumbLink>
                            ) : (
                                <BreadcrumbPage>{item.label}</BreadcrumbPage>
                            )}
                        </BreadcrumbItem>
                        {index < breadcrumbItems.length - 1 && <BreadcrumbSeparator />}
                    </React.Fragment>
                ))}
            </BreadcrumbList>
        </Breadcrumb>
    );
}

export default NavBreadcrumb;
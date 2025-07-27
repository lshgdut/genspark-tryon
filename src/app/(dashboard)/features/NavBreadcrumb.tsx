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

const NavBreadcrumb = () => {
    const pathname = usePathname();

    // 根据路径生成面包屑导航项
    const breadcrumbMap: Record<string, string> = {
        '/': 'Dashboard',
        '/customers': 'Customers',
        '/upload-demo': '文件上传',
        '/products': 'Products',
        '/settings': 'Settings'
    };

    // 默认的面包屑项
    let breadcrumbItems = [
        { href: '/', label: 'Dashboard' },
        { label: 'All Products' } // 默认页面标题
    ];

    // 根据当前路径更新面包屑项
    if (pathname in breadcrumbMap) {
        breadcrumbItems = [
            { href: '/', label: 'Dashboard' },
            { label: breadcrumbMap[pathname] }
        ];
    }

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
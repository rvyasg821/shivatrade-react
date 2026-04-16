/* eslint-disable */
export const ManagementTaskData = [
    {
        "Index": 1,
        "TaskName": "CIS Control",
        "ProjectedDate": "9/25/21",
        "Milestone": 61,
        "Spent": 1240,
        "Owner": "Pete Brown",
        "ProjectedBudget": 10000
    },
    {
        "Index": 2,
        "TaskName": "SIEM",
        "ProjectedDate": "9/25/21",
        "Milestone": 12,
        "Spent": 2615,
        "Owner": "Mike Smith",
        "ProjectedBudget": 25000
    },
    {
        "Index": 3,
        "TaskName": "VAS",
        "ProjectedDate": "7/25/21",
        "Milestone": 4,
        "Spent": 240,
        "Owner": "Mike Smith",
        "ProjectedBudget": 8900


    },
    {
        "Index": 4,
        "TaskName": "IPDF",
        "ProjectedDate": "7/25/21",
        "Milestone": 4,
        "Spent": 190,
        "Owner": "Pete Brown",
        "ProjectedBudget": 3600
    },
    {
        "Index": 5,
        "TaskName": "PenTest",
        "ProjectedDate": "7/25/21",
        "Milestone": 70,
        "Spent": 2000,
        "Owner": "Pete Brown",
        "ProjectedBudget": 19000
    }
]

export const CVEMockData = {
    "resultsPerPage": 20, "startIndex": 0, "totalResults": 26357, "result": {
        "CVE_data_type": "CVE",
        "CVE_data_format": "MITRE",
        "CVE_data_version": "4.0",
        "CVE_data_timestamp": "2021-07-12T04:28Z",
        "CVE_Items": [{
            "cve": {
                "data_type": "CVE",
                "data_format": "MITRE",
                "data_version": "4.0",
                "CVE_data_meta": { "ID": "CVE-2021-33813", "ASSIGNER": "cve@mitre.org" },
                "problemtype": { "problemtype_data": [{ "description": [{ "lang": "en", "value": "CWE-611" }] }] },
                "references": {
                    "reference_data": [{
                        "url": "https://github.com/hunterhacker/jdom/pull/188",
                        "name": "https://github.com/hunterhacker/jdom/pull/188",
                        "refsource": "MISC",
                        "tags": ["Patch", "Third Party Advisory"]
                    }, {
                        "url": "https://github.com/hunterhacker/jdom/releases",
                        "name": "https://github.com/hunterhacker/jdom/releases",
                        "refsource": "MISC",
                        "tags": ["Release Notes", "Third Party Advisory"]
                    }, {
                        "url": "https://alephsecurity.com/vulns/aleph-2021003",
                        "name": "https://alephsecurity.com/vulns/aleph-2021003",
                        "refsource": "MISC",
                        "tags": ["Broken Link"]
                    }, {
                        "url": "https://lists.debian.org/debian-lts-announce/2021/06/msg00026.html",
                        "name": "[debian-lts-announce] 20210629 [SECURITY] [DLA 2696-1] libjdom2-java security update",
                        "refsource": "MLIST",
                        "tags": []
                    }, {
                        "url": "https://lists.apache.org/thread.html/rbc075a4ac85e7a8e47420b7383f16ffa0af3b792b8423584735f369f@%3Cissues.solr.apache.org%3E",
                        "name": "[solr-issues] 20210711 [jira] [Updated] (SOLR-15529) High security vulnerability in JDOM library bundled within Solr 8.9 CVE-2021-33813",
                        "refsource": "MLIST",
                        "tags": []
                    }, {
                        "url": "https://lists.apache.org/thread.html/r9974f64723875052e02787b2a5eda689ac5247c71b827d455e5dc9a6@%3Cissues.solr.apache.org%3E",
                        "name": "[solr-issues] 20210711 [jira] [Created] (SOLR-15529) High security vulnerability in JDOM library bundled within Solr 8.9 CVE-2021-33813",
                        "refsource": "MLIST",
                        "tags": []
                    }]
                },
                "description": {
                    "description_data": [{
                        "lang": "en",
                        "value": "An XXE issue in SAXBuilder in JDOM through 2.0.6 allows attackers to cause a denial of service via a crafted HTTP request."
                    }]
                }
            },
            "configurations": {
                "CVE_data_version": "4.0",
                "nodes": [{
                    "operator": "OR",
                    "children": [],
                    "cpe_match": [{
                        "vulnerable": true,
                        "cpe23Uri": "cpe:2.3:a:jdom:jdom:*:*:*:*:*:*:*:*",
                        "versionEndIncluding": "2.0.6",
                        "cpe_name": []
                    }]
                }]
            },
            "impact": {
                "baseMetricV3": {
                    "cvssV3": {
                        "version": "3.1",
                        "vectorString": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H",
                        "attackVector": "NETWORK",
                        "attackComplexity": "LOW",
                        "privilegesRequired": "NONE",
                        "userInteraction": "NONE",
                        "scope": "UNCHANGED",
                        "confidentialityImpact": "NONE",
                        "integrityImpact": "NONE",
                        "availabilityImpact": "HIGH",
                        "baseScore": 7.5,
                        "baseSeverity": "HIGH"
                    }, "exploitabilityScore": 3.9, "impactScore": 3.6
                },
                "baseMetricV2": {
                    "cvssV2": {
                        "version": "2.0",
                        "vectorString": "AV:N/AC:L/Au:N/C:N/I:N/A:P",
                        "accessVector": "NETWORK",
                        "accessComplexity": "LOW",
                        "authentication": "NONE",
                        "confidentialityImpact": "NONE",
                        "integrityImpact": "NONE",
                        "availabilityImpact": "PARTIAL",
                        "baseScore": 5.0
                    },
                    "severity": "MEDIUM",
                    "exploitabilityScore": 10.0,
                    "impactScore": 2.9,
                    "acInsufInfo": false,
                    "obtainAllPrivilege": false,
                    "obtainUserPrivilege": false,
                    "obtainOtherPrivilege": false,
                    "userInteractionRequired": false
                }
            },
            "publishedDate": "2021-06-16T12:15Z",
            "lastModifiedDate": "2021-07-11T19:15Z"
        }, {
            "cve": {
                "data_type": "CVE",
                "data_format": "MITRE",
                "data_version": "4.0",
                "CVE_data_meta": { "ID": "CVE-2021-22231", "ASSIGNER": "cve@gitlab.com" },
                "problemtype": { "problemtype_data": [{ "description": [{ "lang": "en", "value": "NVD-CWE-noinfo" }] }] },
                "references": {
                    "reference_data": [{
                        "url": "https://gitlab.com/gitlab-org/gitlab/-/issues/26295",
                        "name": "https://gitlab.com/gitlab-org/gitlab/-/issues/26295",
                        "refsource": "MISC",
                        "tags": ["Broken Link"]
                    }, {
                        "url": "https://hackerone.com/reports/475098",
                        "name": "https://hackerone.com/reports/475098",
                        "refsource": "MISC",
                        "tags": ["Permissions Required"]
                    }, {
                        "url": "https://gitlab.com/gitlab-org/cves/-/blob/master/2021/CVE-2021-22231.json",
                        "name": "https://gitlab.com/gitlab-org/cves/-/blob/master/2021/CVE-2021-22231.json",
                        "refsource": "CONFIRM",
                        "tags": ["Vendor Advisory"]
                    }]
                },
                "description": {
                    "description_data": [{
                        "lang": "en",
                        "value": "A denial of service in user's profile page is found starting with GitLab CE/EE 8.0 that allows attacker to reject access to their profile page via using a specially crafted username."
                    }]
                }
            },
            "configurations": {
                "CVE_data_version": "4.0",
                "nodes": [{
                    "operator": "OR",
                    "children": [],
                    "cpe_match": [{
                        "vulnerable": true,
                        "cpe23Uri": "cpe:2.3:a:gitlab:gitlab:*:*:*:*:community:*:*:*",
                        "versionStartIncluding": "8.0.0",
                        "versionEndExcluding": "13.11.6",
                        "cpe_name": []
                    }, {
                        "vulnerable": true,
                        "cpe23Uri": "cpe:2.3:a:gitlab:gitlab:*:*:*:*:community:*:*:*",
                        "versionStartIncluding": "13.12.0",
                        "versionEndExcluding": "13.12.6",
                        "cpe_name": []
                    }, {
                        "vulnerable": true,
                        "cpe23Uri": "cpe:2.3:a:gitlab:gitlab:*:*:*:*:community:*:*:*",
                        "versionStartIncluding": "14.0.0",
                        "versionEndExcluding": "14.0.2",
                        "cpe_name": []
                    }]
                }, {
                    "operator": "OR",
                    "children": [],
                    "cpe_match": [{
                        "vulnerable": true,
                        "cpe23Uri": "cpe:2.3:a:gitlab:gitlab:*:*:*:*:enterprise:*:*:*",
                        "versionStartIncluding": "8.0.0",
                        "versionEndExcluding": "13.11.6",
                        "cpe_name": []
                    }, {
                        "vulnerable": true,
                        "cpe23Uri": "cpe:2.3:a:gitlab:gitlab:*:*:*:*:enterprise:*:*:*",
                        "versionStartIncluding": "13.12.0",
                        "versionEndExcluding": "13.12.6",
                        "cpe_name": []
                    }, {
                        "vulnerable": true,
                        "cpe23Uri": "cpe:2.3:a:gitlab:gitlab:*:*:*:*:enterprise:*:*:*",
                        "versionStartIncluding": "14.0.0",
                        "versionEndExcluding": "14.0.2",
                        "cpe_name": []
                    }]
                }]
            },
            "impact": {
                "baseMetricV3": {
                    "cvssV3": {
                        "version": "3.1",
                        "vectorString": "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:L",
                        "attackVector": "NETWORK",
                        "attackComplexity": "LOW",
                        "privilegesRequired": "LOW",
                        "userInteraction": "NONE",
                        "scope": "UNCHANGED",
                        "confidentialityImpact": "NONE",
                        "integrityImpact": "NONE",
                        "availabilityImpact": "LOW",
                        "baseScore": 4.3,
                        "baseSeverity": "MEDIUM"
                    }, "exploitabilityScore": 2.8, "impactScore": 1.4
                },
                "baseMetricV2": {
                    "cvssV2": {
                        "version": "2.0",
                        "vectorString": "AV:N/AC:L/Au:S/C:N/I:N/A:P",
                        "accessVector": "NETWORK",
                        "accessComplexity": "LOW",
                        "authentication": "SINGLE",
                        "confidentialityImpact": "NONE",
                        "integrityImpact": "NONE",
                        "availabilityImpact": "PARTIAL",
                        "baseScore": 4.0
                    },
                    "severity": "MEDIUM",
                    "exploitabilityScore": 8.0,
                    "impactScore": 2.9,
                    "acInsufInfo": false,
                    "obtainAllPrivilege": false,
                    "obtainUserPrivilege": false,
                    "obtainOtherPrivilege": false,
                    "userInteractionRequired": false
                }
            },
            "publishedDate": "2021-07-07T11:15Z",
            "lastModifiedDate": "2021-07-09T19:02Z"
        }, {
            "cve": {
                "data_type": "CVE",
                "data_format": "MITRE",
                "data_version": "4.0",
                "CVE_data_meta": { "ID": "CVE-2021-3541", "ASSIGNER": "secalert@redhat.com" },
                "problemtype": { "problemtype_data": [{ "description": [] }] },
                "references": {
                    "reference_data": [{
                        "url": "https://bugzilla.redhat.com/show_bug.cgi?id=1950515",
                        "name": "https://bugzilla.redhat.com/show_bug.cgi?id=1950515",
                        "refsource": "MISC",
                        "tags": []
                    }]
                },
                "description": {
                    "description_data": [{
                        "lang": "en",
                        "value": "A flaw was found in libxml2. Exponential entity expansion attack its possible bypassing all existing protection mechanisms and leading to denial of service."
                    }]
                }
            },
            "configurations": { "CVE_data_version": "4.0", "nodes": [] },
            "impact": {},
            "publishedDate": "2021-07-09T17:15Z",
            "lastModifiedDate": "2021-07-09T17:40Z"
        }, {
            "cve": {
                "data_type": "CVE",
                "data_format": "MITRE",
                "data_version": "4.0",
                "CVE_data_meta": { "ID": "CVE-2021-31925", "ASSIGNER": "cve@mitre.org" },
                "problemtype": { "problemtype_data": [{ "description": [{ "lang": "en", "value": "CWE-20" }] }] },
                "references": {
                    "reference_data": [{
                        "url": "https://docs.pexip.com/admin/security_bulletins.htm",
                        "name": "https://docs.pexip.com/admin/security_bulletins.htm",
                        "refsource": "MISC",
                        "tags": ["Vendor Advisory"]
                    }, {
                        "url": "https://docs.pexip.com/admin/security_bulletins.htm#CVE-2021-31925",
                        "name": "https://docs.pexip.com/admin/security_bulletins.htm#CVE-2021-31925",
                        "refsource": "CONFIRM",
                        "tags": ["Vendor Advisory"]
                    }]
                },
                "description": {
                    "description_data": [{
                        "lang": "en",
                        "value": "Pexip Infinity 25.x before 25.4 has Improper Input Validation, and thus an unauthenticated remote attacker can cause a denial of service via the administrative web interface."
                    }]
                }
            },
            "configurations": {
                "CVE_data_version": "4.0",
                "nodes": [{
                    "operator": "OR",
                    "children": [],
                    "cpe_match": [{
                        "vulnerable": true,
                        "cpe23Uri": "cpe:2.3:a:pexip:pexip_infinity:*:*:*:*:*:*:*:*",
                        "versionStartIncluding": "25.0",
                        "versionEndExcluding": "25.4",
                        "cpe_name": []
                    }]
                }]
            },
            "impact": {
                "baseMetricV3": {
                    "cvssV3": {
                        "version": "3.1",
                        "vectorString": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H",
                        "attackVector": "NETWORK",
                        "attackComplexity": "LOW",
                        "privilegesRequired": "NONE",
                        "userInteraction": "NONE",
                        "scope": "UNCHANGED",
                        "confidentialityImpact": "NONE",
                        "integrityImpact": "NONE",
                        "availabilityImpact": "HIGH",
                        "baseScore": 7.5,
                        "baseSeverity": "HIGH"
                    }, "exploitabilityScore": 3.9, "impactScore": 3.6
                },
                "baseMetricV2": {
                    "cvssV2": {
                        "version": "2.0",
                        "vectorString": "AV:N/AC:L/Au:N/C:N/I:N/A:P",
                        "accessVector": "NETWORK",
                        "accessComplexity": "LOW",
                        "authentication": "NONE",
                        "confidentialityImpact": "NONE",
                        "integrityImpact": "NONE",
                        "availabilityImpact": "PARTIAL",
                        "baseScore": 5.0
                    },
                    "severity": "MEDIUM",
                    "exploitabilityScore": 10.0,
                    "impactScore": 2.9,
                    "acInsufInfo": false,
                    "obtainAllPrivilege": false,
                    "obtainUserPrivilege": false,
                    "obtainOtherPrivilege": false,
                    "userInteractionRequired": false
                }
            },
            "publishedDate": "2021-07-07T15:15Z",
            "lastModifiedDate": "2021-07-09T16:53Z"
        }, {
            "cve": {
                "data_type": "CVE",
                "data_format": "MITRE",
                "data_version": "4.0",
                "CVE_data_meta": { "ID": "CVE-2021-25952", "ASSIGNER": "vulnerabilitylab@whitesourcesoftware.com" },
                "problemtype": { "problemtype_data": [{ "description": [{ "lang": "en", "value": "CWE-915" }] }] },
                "references": {
                    "reference_data": [{
                        "url": "https://github.com/angus-c/just/commit/dd57a476f4bb9d78c6f60741898dc04c71d2eb53",
                        "name": "https://github.com/angus-c/just/commit/dd57a476f4bb9d78c6f60741898dc04c71d2eb53",
                        "refsource": "MISC",
                        "tags": ["Patch", "Third Party Advisory"]
                    }, {
                        "url": "https://www.whitesourcesoftware.com/vulnerability-database/CVE-2021-25952",
                        "name": "https://www.whitesourcesoftware.com/vulnerability-database/CVE-2021-25952",
                        "refsource": "MISC",
                        "tags": ["Exploit", "Third Party Advisory"]
                    }]
                },
                "description": {
                    "description_data": [{
                        "lang": "en",
                        "value": "Prototype pollution vulnerability in ‘just-safe-set’ versions 1.0.0 through 2.2.1 allows an attacker to cause a denial of service and may lead to remote code execution."
                    }]
                }
            },
            "configurations": {
                "CVE_data_version": "4.0",
                "nodes": [{
                    "operator": "OR",
                    "children": [],
                    "cpe_match": [{
                        "vulnerable": true,
                        "cpe23Uri": "cpe:2.3:a:just-safe-set_project:just-safe-set:*:*:*:*:*:node.js:*:*",
                        "versionStartIncluding": "1.0.0",
                        "versionEndIncluding": "2.2.1",
                        "cpe_name": []
                    }]
                }]
            },
            "impact": {
                "baseMetricV3": {
                    "cvssV3": {
                        "version": "3.1",
                        "vectorString": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
                        "attackVector": "NETWORK",
                        "attackComplexity": "LOW",
                        "privilegesRequired": "NONE",
                        "userInteraction": "NONE",
                        "scope": "UNCHANGED",
                        "confidentialityImpact": "HIGH",
                        "integrityImpact": "HIGH",
                        "availabilityImpact": "HIGH",
                        "baseScore": 9.8,
                        "baseSeverity": "CRITICAL"
                    }, "exploitabilityScore": 3.9, "impactScore": 5.9
                },
                "baseMetricV2": {
                    "cvssV2": {
                        "version": "2.0",
                        "vectorString": "AV:N/AC:L/Au:N/C:P/I:P/A:P",
                        "accessVector": "NETWORK",
                        "accessComplexity": "LOW",
                        "authentication": "NONE",
                        "confidentialityImpact": "PARTIAL",
                        "integrityImpact": "PARTIAL",
                        "availabilityImpact": "PARTIAL",
                        "baseScore": 7.5
                    },
                    "severity": "HIGH",
                    "exploitabilityScore": 10.0,
                    "impactScore": 6.4,
                    "acInsufInfo": false,
                    "obtainAllPrivilege": false,
                    "obtainUserPrivilege": false,
                    "obtainOtherPrivilege": false,
                    "userInteractionRequired": false
                }
            },
            "publishedDate": "2021-07-07T12:15Z",
            "lastModifiedDate": "2021-07-09T16:46Z"
        }, {
            "cve": {
                "data_type": "CVE",
                "data_format": "MITRE",
                "data_version": "4.0",
                "CVE_data_meta": { "ID": "CVE-2021-32742", "ASSIGNER": "security-advisories@github.com" },
                "problemtype": { "problemtype_data": [{ "description": [] }] },
                "references": {
                    "reference_data": [{
                        "url": "https://github.com/vapor/vapor/security/advisories/GHSA-pqwh-c2f3-vxmq",
                        "name": "https://github.com/vapor/vapor/security/advisories/GHSA-pqwh-c2f3-vxmq",
                        "refsource": "CONFIRM",
                        "tags": []
                    }, {
                        "url": "https://github.com/vapor/vapor/releases/tag/4.47.2",
                        "name": "https://github.com/vapor/vapor/releases/tag/4.47.2",
                        "refsource": "MISC",
                        "tags": []
                    }]
                },
                "description": {
                    "description_data": [{
                        "lang": "en",
                        "value": "Vapor is a web framework for Swift. In versions 4.47.1 and prior, bug in the `Data.init(base32Encoded:)` function opens up the potential for exposing server memory and/or crashing the server (Denial of Service) for applications where untrusted data can end up in said function. Vapor does not currently use this function itself so this only impact applications that use the impacted function directly or through other dependencies. The vulnerability is patched in version 4.47.2. As a workaround, one may use an alternative to Vapor's built-in `Data.init(base32Encoded:)`."
                    }]
                }
            },
            "configurations": { "CVE_data_version": "4.0", "nodes": [] },
            "impact": {},
            "publishedDate": "2021-07-09T14:15Z",
            "lastModifiedDate": "2021-07-09T15:01Z"
        }, {
            "cve": {
                "data_type": "CVE",
                "data_format": "MITRE",
                "data_version": "4.0",
                "CVE_data_meta": { "ID": "CVE-2021-26690", "ASSIGNER": "security@apache.org" },
                "problemtype": { "problemtype_data": [{ "description": [{ "lang": "en", "value": "CWE-476" }] }] },
                "references": {
                    "reference_data": [{
                        "url": "http://httpd.apache.org/security/vulnerabilities_24.html",
                        "name": "N/A",
                        "refsource": "CONFIRM",
                        "tags": ["Release Notes", "Vendor Advisory"]
                    }, {
                        "url": "https://lists.apache.org/thread.html/re026d3da9d7824bd93b9f871c0fdda978d960c7e62d8c43cba8d0bf3%40%3Ccvs.httpd.apache.org%3E",
                        "name": "N/A",
                        "refsource": "CONFIRM",
                        "tags": ["Mailing List", "Vendor Advisory"]
                    }, {
                        "url": "https://lists.apache.org/thread.html/rae406c1d19c0dfd3103c96923dadac2af1cd0bad6905ab1ede153865@%3Cannounce.httpd.apache.org%3E",
                        "name": "[httpd-announce] 20210609 CVE-2021-26690: mod_session NULL pointer dereference",
                        "refsource": "MLIST",
                        "tags": ["Mailing List", "Vendor Advisory"]
                    }, {
                        "url": "https://lists.apache.org/thread.html/r7f2b70b621651548f4b6f027552f1dd91705d7111bb5d15cda0a68dd@%3Cdev.httpd.apache.org%3E",
                        "name": "[httpd-dev] 20210610 Re: svn commit: r1890598 - in /httpd/site/trunk/content/security/json: CVE-2019-17567.json CVE-2020-13938.json CVE-2020-13950.json CVE-2020-35452.json CVE-2021-26690.json CVE-2021-26691.json CVE-2021-30641.json CVE-2021-31618.json",
                        "refsource": "MLIST",
                        "tags": ["Mailing List", "Vendor Advisory"]
                    }, {
                        "url": "http://www.openwall.com/lists/oss-security/2021/06/10/6",
                        "name": "[oss-security] 20210609 CVE-2021-26690: Apache httpd: mod_session NULL pointer dereference",
                        "refsource": "MLIST",
                        "tags": ["Mailing List", "Third Party Advisory"]
                    }, {
                        "url": "https://security.netapp.com/advisory/ntap-20210702-0001/",
                        "name": "https://security.netapp.com/advisory/ntap-20210702-0001/",
                        "refsource": "CONFIRM",
                        "tags": []
                    }, {
                        "url": "https://lists.debian.org/debian-lts-announce/2021/07/msg00006.html",
                        "name": "[debian-lts-announce] 20210709 [SECURITY] [DLA 2706-1] apache2 security update",
                        "refsource": "MLIST",
                        "tags": []
                    }]
                },
                "description": {
                    "description_data": [{
                        "lang": "en",
                        "value": "Apache HTTP Server versions 2.4.0 to 2.4.46 A specially crafted Cookie header handled by mod_session can cause a NULL pointer dereference and crash, leading to a possible Denial Of Service"
                    }]
                }
            },
            "configurations": {
                "CVE_data_version": "4.0",
                "nodes": [{
                    "operator": "OR",
                    "children": [],
                    "cpe_match": [{
                        "vulnerable": true,
                        "cpe23Uri": "cpe:2.3:a:apache:http_server:*:*:*:*:*:*:*:*",
                        "versionStartIncluding": "2.4.0",
                        "versionEndIncluding": "2.4.46",
                        "cpe_name": []
                    }]
                }]
            },
            "impact": {
                "baseMetricV3": {
                    "cvssV3": {
                        "version": "3.1",
                        "vectorString": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H",
                        "attackVector": "NETWORK",
                        "attackComplexity": "LOW",
                        "privilegesRequired": "NONE",
                        "userInteraction": "NONE",
                        "scope": "UNCHANGED",
                        "confidentialityImpact": "NONE",
                        "integrityImpact": "NONE",
                        "availabilityImpact": "HIGH",
                        "baseScore": 7.5,
                        "baseSeverity": "HIGH"
                    }, "exploitabilityScore": 3.9, "impactScore": 3.6
                },
                "baseMetricV2": {
                    "cvssV2": {
                        "version": "2.0",
                        "vectorString": "AV:N/AC:L/Au:N/C:N/I:N/A:P",
                        "accessVector": "NETWORK",
                        "accessComplexity": "LOW",
                        "authentication": "NONE",
                        "confidentialityImpact": "NONE",
                        "integrityImpact": "NONE",
                        "availabilityImpact": "PARTIAL",
                        "baseScore": 5.0
                    },
                    "severity": "MEDIUM",
                    "exploitabilityScore": 10.0,
                    "impactScore": 2.9,
                    "acInsufInfo": false,
                    "obtainAllPrivilege": false,
                    "obtainUserPrivilege": false,
                    "obtainOtherPrivilege": false,
                    "userInteractionRequired": false
                }
            },
            "publishedDate": "2021-06-10T07:15Z",
            "lastModifiedDate": "2021-07-09T12:15Z"
        }, {
            "cve": {
                "data_type": "CVE",
                "data_format": "MITRE",
                "data_version": "4.0",
                "CVE_data_meta": { "ID": "CVE-2021-22222", "ASSIGNER": "cve@gitlab.com" },
                "problemtype": { "problemtype_data": [{ "description": [{ "lang": "en", "value": "CWE-835" }] }] },
                "references": {
                    "reference_data": [{
                        "url": "https://gitlab.com/gitlab-org/cves/-/blob/master/2021/CVE-2021-22222.json",
                        "name": "https://gitlab.com/gitlab-org/cves/-/blob/master/2021/CVE-2021-22222.json",
                        "refsource": "CONFIRM",
                        "tags": ["Third Party Advisory"]
                    }, {
                        "url": "https://www.wireshark.org/security/wnpa-sec-2021-05.html",
                        "name": "https://www.wireshark.org/security/wnpa-sec-2021-05.html",
                        "refsource": "MISC",
                        "tags": ["Vendor Advisory"]
                    }, {
                        "url": "https://gitlab.com/wireshark/wireshark/-/merge_requests/3130",
                        "name": "https://gitlab.com/wireshark/wireshark/-/merge_requests/3130",
                        "refsource": "MISC",
                        "tags": ["Patch", "Third Party Advisory"]
                    }]
                },
                "description": {
                    "description_data": [{
                        "lang": "en",
                        "value": "Infinite loop in DVB-S2-BB dissector in Wireshark 3.4.0 to 3.4.5 allows denial of service via packet injection or crafted capture file"
                    }]
                }
            },
            "configurations": {
                "CVE_data_version": "4.0",
                "nodes": [{
                    "operator": "OR",
                    "children": [],
                    "cpe_match": [{
                        "vulnerable": true,
                        "cpe23Uri": "cpe:2.3:a:wireshark:wireshark:*:*:*:*:*:*:*:*",
                        "versionStartIncluding": "3.4.0",
                        "versionEndIncluding": "3.4.5",
                        "cpe_name": []
                    }]
                }]
            },
            "impact": {
                "baseMetricV3": {
                    "cvssV3": {
                        "version": "3.1",
                        "vectorString": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H",
                        "attackVector": "NETWORK",
                        "attackComplexity": "LOW",
                        "privilegesRequired": "NONE",
                        "userInteraction": "NONE",
                        "scope": "UNCHANGED",
                        "confidentialityImpact": "NONE",
                        "integrityImpact": "NONE",
                        "availabilityImpact": "HIGH",
                        "baseScore": 7.5,
                        "baseSeverity": "HIGH"
                    }, "exploitabilityScore": 3.9, "impactScore": 3.6
                },
                "baseMetricV2": {
                    "cvssV2": {
                        "version": "2.0",
                        "vectorString": "AV:N/AC:L/Au:N/C:N/I:N/A:P",
                        "accessVector": "NETWORK",
                        "accessComplexity": "LOW",
                        "authentication": "NONE",
                        "confidentialityImpact": "NONE",
                        "integrityImpact": "NONE",
                        "availabilityImpact": "PARTIAL",
                        "baseScore": 5.0
                    },
                    "severity": "MEDIUM",
                    "exploitabilityScore": 10.0,
                    "impactScore": 2.9,
                    "acInsufInfo": false,
                    "obtainAllPrivilege": false,
                    "obtainUserPrivilege": false,
                    "obtainOtherPrivilege": false,
                    "userInteractionRequired": false
                }
            },
            "publishedDate": "2021-06-07T13:15Z",
            "lastModifiedDate": "2021-07-09T09:15Z"
        }, {
            "cve": {
                "data_type": "CVE",
                "data_format": "MITRE",
                "data_version": "4.0",
                "CVE_data_meta": { "ID": "CVE-2021-22207", "ASSIGNER": "cve@gitlab.com" },
                "problemtype": { "problemtype_data": [{ "description": [{ "lang": "en", "value": "CWE-89" }] }] },
                "references": {
                    "reference_data": [{
                        "url": "https://gitlab.com/gitlab-org/cves/-/blob/master/2021/CVE-2021-22207.json",
                        "name": "https://gitlab.com/gitlab-org/cves/-/blob/master/2021/CVE-2021-22207.json",
                        "refsource": "CONFIRM",
                        "tags": ["Third Party Advisory"]
                    }, {
                        "url": "https://gitlab.com/wireshark/wireshark/-/issues/17331",
                        "name": "https://gitlab.com/wireshark/wireshark/-/issues/17331",
                        "refsource": "MISC",
                        "tags": ["Exploit", "Third Party Advisory"]
                    }, {
                        "url": "https://www.wireshark.org/security/wnpa-sec-2021-04.html",
                        "name": "https://www.wireshark.org/security/wnpa-sec-2021-04.html",
                        "refsource": "MISC",
                        "tags": ["Vendor Advisory"]
                    }, {
                        "url": "https://lists.fedoraproject.org/archives/list/package-announce@lists.fedoraproject.org/message/GIWWO27HV4HUKXV6NH6ULHCRAQB26DMD/",
                        "name": "FEDORA-2021-67691ad99d",
                        "refsource": "FEDORA",
                        "tags": []
                    }, {
                        "url": "https://lists.fedoraproject.org/archives/list/package-announce@lists.fedoraproject.org/message/NL7ZTMMWIEPHHFK3ONRKATWE7CLIGLFD/",
                        "name": "FEDORA-2021-6e0508d69d",
                        "refsource": "FEDORA",
                        "tags": []
                    }]
                },
                "description": {
                    "description_data": [{
                        "lang": "en",
                        "value": "Excessive memory consumption in MS-WSP dissector in Wireshark 3.4.0 to 3.4.4 and 3.2.0 to 3.2.12 allows denial of service via packet injection or crafted capture file"
                    }]
                }
            },
            "configurations": {
                "CVE_data_version": "4.0",
                "nodes": [{
                    "operator": "OR",
                    "children": [],
                    "cpe_match": [{
                        "vulnerable": true,
                        "cpe23Uri": "cpe:2.3:a:wireshark:wireshark:*:*:*:*:*:*:*:*",
                        "versionStartIncluding": "3.2.0",
                        "versionEndIncluding": "3.2.12",
                        "cpe_name": []
                    }, {
                        "vulnerable": true,
                        "cpe23Uri": "cpe:2.3:a:wireshark:wireshark:*:*:*:*:*:*:*:*",
                        "versionStartIncluding": "3.4.0",
                        "versionEndIncluding": "3.4.4",
                        "cpe_name": []
                    }]
                }]
            },
            "impact": {
                "baseMetricV3": {
                    "cvssV3": {
                        "version": "3.1",
                        "vectorString": "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:H",
                        "attackVector": "NETWORK",
                        "attackComplexity": "LOW",
                        "privilegesRequired": "LOW",
                        "userInteraction": "NONE",
                        "scope": "UNCHANGED",
                        "confidentialityImpact": "NONE",
                        "integrityImpact": "NONE",
                        "availabilityImpact": "HIGH",
                        "baseScore": 6.5,
                        "baseSeverity": "MEDIUM"
                    }, "exploitabilityScore": 2.8, "impactScore": 3.6
                },
                "baseMetricV2": {
                    "cvssV2": {
                        "version": "2.0",
                        "vectorString": "AV:N/AC:L/Au:N/C:N/I:N/A:P",
                        "accessVector": "NETWORK",
                        "accessComplexity": "LOW",
                        "authentication": "NONE",
                        "confidentialityImpact": "NONE",
                        "integrityImpact": "NONE",
                        "availabilityImpact": "PARTIAL",
                        "baseScore": 5.0
                    },
                    "severity": "MEDIUM",
                    "exploitabilityScore": 10.0,
                    "impactScore": 2.9,
                    "acInsufInfo": false,
                    "obtainAllPrivilege": false,
                    "obtainUserPrivilege": false,
                    "obtainOtherPrivilege": false,
                    "userInteractionRequired": false
                }
            },
            "publishedDate": "2021-04-23T18:15Z",
            "lastModifiedDate": "2021-07-09T09:15Z"
        }, {
            "cve": {
                "data_type": "CVE",
                "data_format": "MITRE",
                "data_version": "4.0",
                "CVE_data_meta": { "ID": "CVE-2021-22174", "ASSIGNER": "cve@gitlab.com" },
                "problemtype": { "problemtype_data": [{ "description": [{ "lang": "en", "value": "CWE-400" }] }] },
                "references": {
                    "reference_data": [{
                        "url": "https://gitlab.com/gitlab-org/cves/-/blob/master/2021/CVE-2021-22174.json",
                        "name": "https://gitlab.com/gitlab-org/cves/-/blob/master/2021/CVE-2021-22174.json",
                        "refsource": "CONFIRM",
                        "tags": ["Third Party Advisory"]
                    }, {
                        "url": "https://gitlab.com/wireshark/wireshark/-/issues/17165",
                        "name": "https://gitlab.com/wireshark/wireshark/-/issues/17165",
                        "refsource": "MISC",
                        "tags": ["Exploit", "Third Party Advisory"]
                    }, {
                        "url": "https://www.wireshark.org/security/wnpa-sec-2021-02.html",
                        "name": "https://www.wireshark.org/security/wnpa-sec-2021-02.html",
                        "refsource": "MISC",
                        "tags": ["Vendor Advisory"]
                    }, {
                        "url": "https://lists.fedoraproject.org/archives/list/package-announce@lists.fedoraproject.org/message/GND3PIQC3KZALR227V4YUMPKJBA5BZG4/",
                        "name": "FEDORA-2021-f22ce64b3b",
                        "refsource": "FEDORA",
                        "tags": ["Mailing List", "Third Party Advisory"]
                    }, {
                        "url": "https://lists.fedoraproject.org/archives/list/package-announce@lists.fedoraproject.org/message/NYXLKQJ3D632XSG6VO7M4YFDAG6GRCLY/",
                        "name": "FEDORA-2021-5522a34aa0",
                        "refsource": "FEDORA",
                        "tags": ["Mailing List", "Third Party Advisory"]
                    }, {
                        "url": "https://www.oracle.com/security-alerts/cpuApr2021.html",
                        "name": "https://www.oracle.com/security-alerts/cpuApr2021.html",
                        "refsource": "MISC",
                        "tags": ["Patch", "Third Party Advisory"]
                    }]
                },
                "description": {
                    "description_data": [{
                        "lang": "en",
                        "value": "Crash in USB HID dissector in Wireshark 3.4.0 to 3.4.2 allows denial of service via packet injection or crafted capture file"
                    }]
                }
            },
            "configurations": {
                "CVE_data_version": "4.0",
                "nodes": [{
                    "operator": "OR",
                    "children": [],
                    "cpe_match": [{
                        "vulnerable": true,
                        "cpe23Uri": "cpe:2.3:a:wireshark:wireshark:*:*:*:*:*:*:*:*",
                        "versionStartIncluding": "3.4.0",
                        "versionEndExcluding": "3.4.3",
                        "cpe_name": []
                    }]
                }, {
                    "operator": "OR",
                    "children": [],
                    "cpe_match": [{
                        "vulnerable": true,
                        "cpe23Uri": "cpe:2.3:o:fedoraproject:fedora:32:*:*:*:*:*:*:*",
                        "cpe_name": []
                    }, {
                        "vulnerable": true,
                        "cpe23Uri": "cpe:2.3:o:fedoraproject:fedora:33:*:*:*:*:*:*:*",
                        "cpe_name": []
                    }]
                }, {
                    "operator": "OR",
                    "children": [],
                    "cpe_match": [{
                        "vulnerable": true,
                        "cpe23Uri": "cpe:2.3:o:oracle:zfs_storage_appliance:8.8:*:*:*:*:*:*:*",
                        "cpe_name": []
                    }]
                }]
            },
            "impact": {
                "baseMetricV3": {
                    "cvssV3": {
                        "version": "3.1",
                        "vectorString": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H",
                        "attackVector": "NETWORK",
                        "attackComplexity": "LOW",
                        "privilegesRequired": "NONE",
                        "userInteraction": "NONE",
                        "scope": "UNCHANGED",
                        "confidentialityImpact": "NONE",
                        "integrityImpact": "NONE",
                        "availabilityImpact": "HIGH",
                        "baseScore": 7.5,
                        "baseSeverity": "HIGH"
                    }, "exploitabilityScore": 3.9, "impactScore": 3.6
                },
                "baseMetricV2": {
                    "cvssV2": {
                        "version": "2.0",
                        "vectorString": "AV:N/AC:L/Au:N/C:N/I:N/A:P",
                        "accessVector": "NETWORK",
                        "accessComplexity": "LOW",
                        "authentication": "NONE",
                        "confidentialityImpact": "NONE",
                        "integrityImpact": "NONE",
                        "availabilityImpact": "PARTIAL",
                        "baseScore": 5.0
                    },
                    "severity": "MEDIUM",
                    "exploitabilityScore": 10.0,
                    "impactScore": 2.9,
                    "acInsufInfo": false,
                    "obtainAllPrivilege": false,
                    "obtainUserPrivilege": false,
                    "obtainOtherPrivilege": false,
                    "userInteractionRequired": false
                }
            },
            "publishedDate": "2021-02-17T15:15Z",
            "lastModifiedDate": "2021-07-09T09:15Z"
        }, {
            "cve": {
                "data_type": "CVE",
                "data_format": "MITRE",
                "data_version": "4.0",
                "CVE_data_meta": { "ID": "CVE-2021-22173", "ASSIGNER": "cve@gitlab.com" },
                "problemtype": { "problemtype_data": [{ "description": [{ "lang": "en", "value": "CWE-401" }] }] },
                "references": {
                    "reference_data": [{
                        "url": "https://gitlab.com/wireshark/wireshark/-/issues/17124",
                        "name": "https://gitlab.com/wireshark/wireshark/-/issues/17124",
                        "refsource": "MISC",
                        "tags": ["Exploit", "Third Party Advisory"]
                    }, {
                        "url": "https://www.wireshark.org/security/wnpa-sec-2021-01.html",
                        "name": "https://www.wireshark.org/security/wnpa-sec-2021-01.html",
                        "refsource": "MISC",
                        "tags": ["Vendor Advisory"]
                    }, {
                        "url": "https://gitlab.com/gitlab-org/cves/-/blob/master/2021/CVE-2021-22173.json",
                        "name": "https://gitlab.com/gitlab-org/cves/-/blob/master/2021/CVE-2021-22173.json",
                        "refsource": "CONFIRM",
                        "tags": ["Third Party Advisory"]
                    }, {
                        "url": "https://lists.fedoraproject.org/archives/list/package-announce@lists.fedoraproject.org/message/GND3PIQC3KZALR227V4YUMPKJBA5BZG4/",
                        "name": "FEDORA-2021-f22ce64b3b",
                        "refsource": "FEDORA",
                        "tags": ["Mailing List", "Third Party Advisory"]
                    }, {
                        "url": "https://lists.fedoraproject.org/archives/list/package-announce@lists.fedoraproject.org/message/NYXLKQJ3D632XSG6VO7M4YFDAG6GRCLY/",
                        "name": "FEDORA-2021-5522a34aa0",
                        "refsource": "FEDORA",
                        "tags": ["Mailing List", "Third Party Advisory"]
                    }, {
                        "url": "https://www.oracle.com/security-alerts/cpuApr2021.html",
                        "name": "https://www.oracle.com/security-alerts/cpuApr2021.html",
                        "refsource": "MISC",
                        "tags": ["Patch", "Third Party Advisory"]
                    }]
                },
                "description": {
                    "description_data": [{
                        "lang": "en",
                        "value": "Memory leak in USB HID dissector in Wireshark 3.4.0 to 3.4.2 allows denial of service via packet injection or crafted capture file"
                    }]
                }
            },
            "configurations": {
                "CVE_data_version": "4.0",
                "nodes": [{
                    "operator": "OR",
                    "children": [],
                    "cpe_match": [{
                        "vulnerable": true,
                        "cpe23Uri": "cpe:2.3:a:wireshark:wireshark:*:*:*:*:*:*:*:*",
                        "versionStartIncluding": "3.4.0",
                        "versionEndExcluding": "3.4.3",
                        "cpe_name": []
                    }]
                }, {
                    "operator": "OR",
                    "children": [],
                    "cpe_match": [{
                        "vulnerable": true,
                        "cpe23Uri": "cpe:2.3:o:fedoraproject:fedora:32:*:*:*:*:*:*:*",
                        "cpe_name": []
                    }, {
                        "vulnerable": true,
                        "cpe23Uri": "cpe:2.3:o:fedoraproject:fedora:33:*:*:*:*:*:*:*",
                        "cpe_name": []
                    }]
                }, {
                    "operator": "OR",
                    "children": [],
                    "cpe_match": [{
                        "vulnerable": true,
                        "cpe23Uri": "cpe:2.3:o:oracle:zfs_storage_appliance:8.8:*:*:*:*:*:*:*",
                        "cpe_name": []
                    }]
                }]
            },
            "impact": {
                "baseMetricV3": {
                    "cvssV3": {
                        "version": "3.1",
                        "vectorString": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H",
                        "attackVector": "NETWORK",
                        "attackComplexity": "LOW",
                        "privilegesRequired": "NONE",
                        "userInteraction": "NONE",
                        "scope": "UNCHANGED",
                        "confidentialityImpact": "NONE",
                        "integrityImpact": "NONE",
                        "availabilityImpact": "HIGH",
                        "baseScore": 7.5,
                        "baseSeverity": "HIGH"
                    }, "exploitabilityScore": 3.9, "impactScore": 3.6
                },
                "baseMetricV2": {
                    "cvssV2": {
                        "version": "2.0",
                        "vectorString": "AV:N/AC:L/Au:N/C:N/I:N/A:P",
                        "accessVector": "NETWORK",
                        "accessComplexity": "LOW",
                        "authentication": "NONE",
                        "confidentialityImpact": "NONE",
                        "integrityImpact": "NONE",
                        "availabilityImpact": "PARTIAL",
                        "baseScore": 5.0
                    },
                    "severity": "MEDIUM",
                    "exploitabilityScore": 10.0,
                    "impactScore": 2.9,
                    "acInsufInfo": false,
                    "obtainAllPrivilege": false,
                    "obtainUserPrivilege": false,
                    "obtainOtherPrivilege": false,
                    "userInteractionRequired": false
                }
            },
            "publishedDate": "2021-02-17T15:15Z",
            "lastModifiedDate": "2021-07-09T09:15Z"
        }, {
            "cve": {
                "data_type": "CVE",
                "data_format": "MITRE",
                "data_version": "4.0",
                "CVE_data_meta": { "ID": "CVE-2021-1595", "ASSIGNER": "psirt@cisco.com" },
                "problemtype": { "problemtype_data": [{ "description": [] }] },
                "references": {
                    "reference_data": [{
                        "url": "https://tools.cisco.com/security/center/content/CiscoSecurityAdvisory/cisco-sa-ipcamera-lldp-mem-wGqundTq",
                        "name": "20210707 Cisco Video Surveillance 7000 Series IP Cameras Link Layer Discovery Protocol Memory Leak Vulnerabilities",
                        "refsource": "CISCO",
                        "tags": []
                    }]
                },
                "description": {
                    "description_data": [{
                        "lang": "en",
                        "value": "Multiple vulnerabilities in the Link Layer Discovery Protocol (LLDP) implementation for Cisco Video Surveillance 7000 Series IP Cameras could allow an unauthenticated, adjacent attacker to cause a memory leak, which could lead to a denial of service (DoS) condition on an affected device. These vulnerabilities are due to incorrect processing of certain LLDP packets at ingress time. An attacker could exploit these vulnerabilities by sending crafted LLDP packets to an affected device. A successful exploit could allow the attacker to cause the affected device to continuously consume memory, which could cause the device to crash and reload, resulting in a DoS condition. Note: LLDP is a Layer 2 protocol. To exploit these vulnerabilities, an attacker must be in the same broadcast domain as the affected device (Layer 2 adjacent)."
                    }]
                }
            },
            "configurations": { "CVE_data_version": "4.0", "nodes": [] },
            "impact": {},
            "publishedDate": "2021-07-08T19:15Z",
            "lastModifiedDate": "2021-07-08T19:54Z"
        }, {
            "cve": {
                "data_type": "CVE",
                "data_format": "MITRE",
                "data_version": "4.0",
                "CVE_data_meta": { "ID": "CVE-2021-1596", "ASSIGNER": "psirt@cisco.com" },
                "problemtype": { "problemtype_data": [{ "description": [] }] },
                "references": {
                    "reference_data": [{
                        "url": "https://.cisco.com/security/center/content/CiscoSecurityAdvisory/cisco-sa-ipcamera-lldp-mem-wGqundTq",
                        "name": "20210707 Cisco Video Surveillance 7000 Series IP Cameras Link Layer Discovery Protocol Memory Leak Vulnerabilities",
                        "refsource": "CISCO",
                        "tags": []
                    }]
                },
                "description": {
                    "description_data": [{
                        "lang": "en",
                        "value": "Multiple vulnerabilities in the Link Layer Discovery Protocol (LLDP) implementation for Cisco Video Surveillance 7000 Series IP Cameras could allow an unauthenticated, adjacent attacker to cause a memory leak, which could lead to a denial of service (DoS) condition on an affected device. These vulnerabilities are due to incorrect processing of certain LLDP packets at ingress time. An attacker could exploit these vulnerabilities by sending crafted LLDP packets to an affected device. A successful exploit could allow the attacker to cause the affected device to continuously consume memory, which could cause the device to crash and reload, resulting in a DoS condition. Note: LLDP is a Layer 2 protocol. To exploit these vulnerabilities, an attacker must be in the same broadcast domain as the affected device (Layer 2 adjacent)."
                    }]
                }
            },
            "configurations": { "CVE_data_version": "4.0", "nodes": [] },
            "impact": {},
            "publishedDate": "2021-07-08T19:15Z",
            "lastModifiedDate": "2021-07-08T19:54Z"
        }, {
            "cve": {
                "data_type": "CVE",
                "data_format": "MITRE",
                "data_version": "4.0",
                "CVE_data_meta": { "ID": "CVE-2021-1597", "ASSIGNER": "psirt@cisco.com" },
                "problemtype": { "problemtype_data": [{ "description": [] }] },
                "references": {
                    "reference_data": [{
                        "url": "https://tools.cisco.com/security/center/content/CiscoSecurityAdvisory/cisco-sa-ipcamera-lldp-mem-wGqundTq",
                        "name": "20210707 Cisco Video Surveillance 7000 Series IP Cameras Link Layer Discovery Protocol Memory Leak Vulnerabilities",
                        "refsource": "CISCO",
                        "tags": []
                    }]
                },
                "description": {
                    "description_data": [{
                        "lang": "en",
                        "value": "Multiple vulnerabilities in the Link Layer Discovery Protocol (LLDP) implementation for Cisco Video Surveillance 7000 Series IP Cameras could allow an unauthenticated, adjacent attacker to cause a memory leak, which could lead to a denial of service (DoS) condition on an affected device. These vulnerabilities are due to incorrect processing of certain LLDP packets at ingress time. An attacker could exploit these vulnerabilities by sending crafted LLDP packets to an affected device. A successful exploit could allow the attacker to cause the affected device to continuously consume memory, which could cause the device to crash and reload, resulting in a DoS condition. Note: LLDP is a Layer 2 protocol. To exploit these vulnerabilities, an attacker must be in the same broadcast domain as the affected device (Layer 2 adjacent)."
                    }]
                }
            },
            "configurations": { "CVE_data_version": "4.0", "nodes": [] },
            "impact": {},
            "publishedDate": "2021-07-08T19:15Z",
            "lastModifiedDate": "2021-07-08T19:54Z"
        }, {
            "cve": {
                "data_type": "CVE",
                "data_format": "MITRE",
                "data_version": "4.0",
                "CVE_data_meta": { "ID": "CVE-2021-1598", "ASSIGNER": "psirt@cisco.com" },
                "problemtype": { "problemtype_data": [{ "description": [] }] },
                "references": {
                    "reference_data": [{
                        "url": "https://.cisco.com/security/center/content/CiscoSecurityAdvisory/cisco-sa-ipcamera-lldp-mem-wGqundTq",
                        "name": "20210707 Cisco Video Surveillance 7000 Series IP Cameras Link Layer Discovery Protocol Memory Leak Vulnerabilities",
                        "refsource": "CISCO",
                        "tags": []
                    }]
                },
                "description": {
                    "description_data": [{
                        "lang": "en",
                        "value": "Multiple vulnerabilities in the Link Layer Discovery Protocol (LLDP) implementation for Cisco Video Surveillance 7000 Series IP Cameras could allow an unauthenticated, adjacent attacker to cause a memory leak, which could lead to a denial of service (DoS) condition on an affected device. These vulnerabilities are due to incorrect processing of certain LLDP packets at ingress time. An attacker could exploit these vulnerabilities by sending crafted LLDP packets to an affected device. A successful exploit could allow the attacker to cause the affected device to continuously consume memory, which could cause the device to crash and reload, resulting in a DoS condition. Note: LLDP is a Layer 2 protocol. To exploit these vulnerabilities, an attacker must be in the same broadcast domain as the affected device (Layer 2 adjacent)."
                    }]
                }
            },
            "configurations": { "CVE_data_version": "4.0", "nodes": [] },
            "impact": {},
            "publishedDate": "2021-07-08T19:15Z",
            "lastModifiedDate": "2021-07-08T19:54Z"
        }, {
            "cve": {
                "data_type": "CVE",
                "data_format": "MITRE",
                "data_version": "4.0",
                "CVE_data_meta": { "ID": "CVE-2021-29152", "ASSIGNER": "security-alert@hpe.com" },
                "problemtype": { "problemtype_data": [{ "description": [] }] },
                "references": {
                    "reference_data": [{
                        "url": "https://www.arubanetworks.com/assets/alert/ARUBA-PSA-2021-012.txt",
                        "name": "https://www.arubanetworks.com/assets/alert/ARUBA-PSA-2021-012.txt",
                        "refsource": "MISC",
                        "tags": []
                    }]
                },
                "description": {
                    "description_data": [{
                        "lang": "en",
                        "value": "A remote denial of service (DoS) vulnerability was discovered in Aruba ClearPass Policy Manager version(s): Prior to 6.10.0, 6.9.6 and 6.8.9. Aruba has released updates to ClearPass Policy Manager that address this security vulnerability."
                    }]
                }
            },
            "configurations": { "CVE_data_version": "4.0", "nodes": [] },
            "impact": {},
            "publishedDate": "2021-07-08T16:15Z",
            "lastModifiedDate": "2021-07-08T16:30Z"
        }, {
            "cve": {
                "data_type": "CVE",
                "data_format": "MITRE",
                "data_version": "4.0",
                "CVE_data_meta": { "ID": "CVE-2021-23382", "ASSIGNER": "report@snyk.io" },
                "problemtype": { "problemtype_data": [{ "description": [{ "lang": "en", "value": "NVD-CWE-Other" }] }] },
                "references": {
                    "reference_data": [{
                        "url": "https://github.com/postcss/postcss/commit/2b1d04c867995e55124e0a165b7c6622c1735956",
                        "name": "https://github.com/postcss/postcss/commit/2b1d04c867995e55124e0a165b7c6622c1735956",
                        "refsource": "MISC",
                        "tags": ["Patch", "Third Party Advisory"]
                    }, {
                        "url": "https://snyk.io/vuln/SNYK-JAVA-ORGWEBJARSNPM-1255641",
                        "name": "https://snyk.io/vuln/SNYK-JAVA-ORGWEBJARSNPM-1255641",
                        "refsource": "MISC",
                        "tags": ["Exploit", "Patch", "Third Party Advisory"]
                    }, {
                        "url": "https://snyk.io/vuln/SNYK-JS-POSTCSS-1255640",
                        "name": "https://snyk.io/vuln/SNYK-JS-POSTCSS-1255640",
                        "refsource": "MISC",
                        "tags": ["Exploit", "Patch", "Third Party Advisory"]
                    }]
                },
                "description": {
                    "description_data": [{
                        "lang": "en",
                        "value": "The package postcss before 8.2.13 are vulnerable to Regular Expression Denial of Service (ReDoS) via getAnnotationURL() and loadAnnotation() in lib/previous-map.js. The vulnerable regexes are caused mainly by the sub-pattern \\/\\*\\s* sourceMappingURL=(.*)."
                    }]
                }
            },
            "configurations": {
                "CVE_data_version": "4.0",
                "nodes": [{
                    "operator": "OR",
                    "children": [],
                    "cpe_match": [{
                        "vulnerable": true,
                        "cpe23Uri": "cpe:2.3:a:postcss:postcss:*:*:*:*:*:node.js:*:*",
                        "versionEndExcluding": "7.0.36",
                        "cpe_name": []
                    }, {
                        "vulnerable": true,
                        "cpe23Uri": "cpe:2.3:a:postcss:postcss:*:*:*:*:*:node.js:*:*",
                        "versionStartIncluding": "8.0.0",
                        "versionEndExcluding": "8.2.13",
                        "cpe_name": []
                    }]
                }]
            },
            "impact": {
                "baseMetricV3": {
                    "cvssV3": {
                        "version": "3.1",
                        "vectorString": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L",
                        "attackVector": "NETWORK",
                        "attackComplexity": "LOW",
                        "privilegesRequired": "NONE",
                        "userInteraction": "NONE",
                        "scope": "UNCHANGED",
                        "confidentialityImpact": "NONE",
                        "integrityImpact": "NONE",
                        "availabilityImpact": "LOW",
                        "baseScore": 5.3,
                        "baseSeverity": "MEDIUM"
                    }, "exploitabilityScore": 3.9, "impactScore": 1.4
                },
                "baseMetricV2": {
                    "cvssV2": {
                        "version": "2.0",
                        "vectorString": "AV:N/AC:L/Au:N/C:N/I:N/A:P",
                        "accessVector": "NETWORK",
                        "accessComplexity": "LOW",
                        "authentication": "NONE",
                        "confidentialityImpact": "NONE",
                        "integrityImpact": "NONE",
                        "availabilityImpact": "PARTIAL",
                        "baseScore": 5.0
                    },
                    "severity": "MEDIUM",
                    "exploitabilityScore": 10.0,
                    "impactScore": 2.9,
                    "acInsufInfo": false,
                    "obtainAllPrivilege": false,
                    "obtainUserPrivilege": false,
                    "obtainOtherPrivilege": false,
                    "userInteractionRequired": false
                }
            },
            "publishedDate": "2021-04-26T16:15Z",
            "lastModifiedDate": "2021-07-08T15:04Z"
        }, {
            "cve": {
                "data_type": "CVE",
                "data_format": "MITRE",
                "data_version": "4.0",
                "CVE_data_meta": { "ID": "CVE-2020-20215", "ASSIGNER": "cve@mitre.org" },
                "problemtype": { "problemtype_data": [{ "description": [{ "lang": "en", "value": "CWE-119" }] }] },
                "references": {
                    "reference_data": [{
                        "url": "https://mikrotik.com/",
                        "name": "https://mikrotik.com/",
                        "refsource": "MISC",
                        "tags": ["Vendor Advisory"]
                    }, {
                        "url": "http://seclists.org/fulldisclosure/2021/May/10",
                        "name": "http://seclists.org/fulldisclosure/2021/May/10",
                        "refsource": "MISC",
                        "tags": ["Mailing List", "Third Party Advisory"]
                    }]
                },
                "description": {
                    "description_data": [{
                        "lang": "en",
                        "value": "Mikrotik RouterOs 6.44.6 (long-term tree) suffers from a memory corruption vulnerability in the /nova/bin/diskd process. An authenticated remote attacker can cause a Denial of Service due to invalid memory access."
                    }]
                }
            },
            "configurations": {
                "CVE_data_version": "4.0",
                "nodes": [{
                    "operator": "OR",
                    "children": [],
                    "cpe_match": [{
                        "vulnerable": true,
                        "cpe23Uri": "cpe:2.3:o:mikrotik:routeros:6.44.6:*:*:*:ltr:*:*:*",
                        "cpe_name": []
                    }]
                }]
            },
            "impact": {
                "baseMetricV3": {
                    "cvssV3": {
                        "version": "3.1",
                        "vectorString": "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:H",
                        "attackVector": "NETWORK",
                        "attackComplexity": "LOW",
                        "privilegesRequired": "LOW",
                        "userInteraction": "NONE",
                        "scope": "UNCHANGED",
                        "confidentialityImpact": "NONE",
                        "integrityImpact": "NONE",
                        "availabilityImpact": "HIGH",
                        "baseScore": 6.5,
                        "baseSeverity": "MEDIUM"
                    }, "exploitabilityScore": 2.8, "impactScore": 3.6
                },
                "baseMetricV2": {
                    "cvssV2": {
                        "version": "2.0",
                        "vectorString": "AV:N/AC:L/Au:S/C:N/I:N/A:P",
                        "accessVector": "NETWORK",
                        "accessComplexity": "LOW",
                        "authentication": "SINGLE",
                        "confidentialityImpact": "NONE",
                        "integrityImpact": "NONE",
                        "availabilityImpact": "PARTIAL",
                        "baseScore": 4.0
                    },
                    "severity": "MEDIUM",
                    "exploitabilityScore": 8.0,
                    "impactScore": 2.9,
                    "acInsufInfo": false,
                    "obtainAllPrivilege": false,
                    "obtainUserPrivilege": false,
                    "obtainOtherPrivilege": false,
                    "userInteractionRequired": false
                }
            },
            "publishedDate": "2021-07-07T14:15Z",
            "lastModifiedDate": "2021-07-08T13:34Z"
        }, {
            "cve": {
                "data_type": "CVE",
                "data_format": "MITRE",
                "data_version": "4.0",
                "CVE_data_meta": { "ID": "CVE-2020-20213", "ASSIGNER": "cve@mitre.org" },
                "problemtype": { "problemtype_data": [{ "description": [{ "lang": "en", "value": "CWE-400" }] }] },
                "references": {
                    "reference_data": [{
                        "url": "https://mikrotik.com/",
                        "name": "https://mikrotik.com/",
                        "refsource": "MISC",
                        "tags": ["Vendor Advisory"]
                    }, {
                        "url": "http://seclists.org/fulldisclosure/2021/May/10",
                        "name": "http://seclists.org/fulldisclosure/2021/May/10",
                        "refsource": "MISC",
                        "tags": ["Mailing List", "Third Party Advisory"]
                    }]
                },
                "description": {
                    "description_data": [{
                        "lang": "en",
                        "value": "Mikrotik RouterOs 6.44.5 (long-term tree) suffers from an stack exhaustion vulnerability in the /nova/bin/net process. An authenticated remote attacker can cause a Denial of Service due to overloading the systems CPU."
                    }]
                }
            },
            "configurations": {
                "CVE_data_version": "4.0",
                "nodes": [{
                    "operator": "OR",
                    "children": [],
                    "cpe_match": [{
                        "vulnerable": true,
                        "cpe23Uri": "cpe:2.3:o:mikrotik:routeros:6.44.5:*:*:*:ltr:*:*:*",
                        "cpe_name": []
                    }]
                }]
            },
            "impact": {
                "baseMetricV3": {
                    "cvssV3": {
                        "version": "3.1",
                        "vectorString": "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:H",
                        "attackVector": "NETWORK",
                        "attackComplexity": "LOW",
                        "privilegesRequired": "LOW",
                        "userInteraction": "NONE",
                        "scope": "UNCHANGED",
                        "confidentialityImpact": "NONE",
                        "integrityImpact": "NONE",
                        "availabilityImpact": "HIGH",
                        "baseScore": 6.5,
                        "baseSeverity": "MEDIUM"
                    }, "exploitabilityScore": 2.8, "impactScore": 3.6
                },
                "baseMetricV2": {
                    "cvssV2": {
                        "version": "2.0",
                        "vectorString": "AV:N/AC:L/Au:S/C:N/I:N/A:P",
                        "accessVector": "NETWORK",
                        "accessComplexity": "LOW",
                        "authentication": "SINGLE",
                        "confidentialityImpact": "NONE",
                        "integrityImpact": "NONE",
                        "availabilityImpact": "PARTIAL",
                        "baseScore": 4.0
                    },
                    "severity": "MEDIUM",
                    "exploitabilityScore": 8.0,
                    "impactScore": 2.9,
                    "acInsufInfo": false,
                    "obtainAllPrivilege": false,
                    "obtainUserPrivilege": false,
                    "obtainOtherPrivilege": false,
                    "userInteractionRequired": false
                }
            },
            "publishedDate": "2021-07-07T14:15Z",
            "lastModifiedDate": "2021-07-08T13:27Z"
        }, {
            "cve": {
                "data_type": "CVE",
                "data_format": "MITRE",
                "data_version": "4.0",
                "CVE_data_meta": { "ID": "CVE-2020-20212", "ASSIGNER": "cve@mitre.org" },
                "problemtype": { "problemtype_data": [{ "description": [{ "lang": "en", "value": "CWE-476" }] }] },
                "references": {
                    "reference_data": [{
                        "url": "http://seclists.org/fulldisclosure/2021/May/0",
                        "name": "http://seclists.org/fulldisclosure/2021/May/0",
                        "refsource": "MISC",
                        "tags": ["Exploit", "Mailing List", "Third Party Advisory"]
                    }, {
                        "url": "https://mikrotik.com/",
                        "name": "https://mikrotik.com/",
                        "refsource": "MISC",
                        "tags": ["Vendor Advisory"]
                    }]
                },
                "description": {
                    "description_data": [{
                        "lang": "en",
                        "value": "Mikrotik RouterOs 6.44.5 (long-term tree) suffers from a memory corruption vulnerability in the /nova/bin/console process. An authenticated remote attacker can cause a Denial of Service (NULL pointer dereference)."
                    }]
                }
            },
            "configurations": {
                "CVE_data_version": "4.0",
                "nodes": [{
                    "operator": "OR",
                    "children": [],
                    "cpe_match": [{
                        "vulnerable": true,
                        "cpe23Uri": "cpe:2.3:o:mikrotik:routeros:6.44.5:*:*:*:ltr:*:*:*",
                        "cpe_name": []
                    }]
                }]
            },
            "impact": {
                "baseMetricV3": {
                    "cvssV3": {
                        "version": "3.1",
                        "vectorString": "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:H",
                        "attackVector": "NETWORK",
                        "attackComplexity": "LOW",
                        "privilegesRequired": "LOW",
                        "userInteraction": "NONE",
                        "scope": "UNCHANGED",
                        "confidentialityImpact": "NONE",
                        "integrityImpact": "NONE",
                        "availabilityImpact": "HIGH",
                        "baseScore": 6.5,
                        "baseSeverity": "MEDIUM"
                    }, "exploitabilityScore": 2.8, "impactScore": 3.6
                },
                "baseMetricV2": {
                    "cvssV2": {
                        "version": "2.0",
                        "vectorString": "AV:N/AC:L/Au:S/C:N/I:N/A:P",
                        "accessVector": "NETWORK",
                        "accessComplexity": "LOW",
                        "authentication": "SINGLE",
                        "confidentialityImpact": "NONE",
                        "integrityImpact": "NONE",
                        "availabilityImpact": "PARTIAL",
                        "baseScore": 4.0
                    },
                    "severity": "MEDIUM",
                    "exploitabilityScore": 8.0,
                    "impactScore": 2.9,
                    "acInsufInfo": false,
                    "obtainAllPrivilege": false,
                    "obtainUserPrivilege": false,
                    "obtainOtherPrivilege": false,
                    "userInteractionRequired": false
                }
            },
            "publishedDate": "2021-07-07T14:15Z",
            "lastModifiedDate": "2021-07-08T13:27Z"
        }]
    }
}
export const CVEData = {
    data: {
        "resultsPerPage": 1, "startIndex": 0, "totalResults": 1, "result": {
            "CVE_data_type": "CVE",
            "CVE_data_format": "MITRE",
            "CVE_data_version": "4.0",
            "CVE_data_timestamp": "2021-07-21T12:53Z",
            "CVE_Items": [{
                "cve": {
                    "data_type": "CVE",
                    "data_format": "MITRE",
                    "data_version": "4.0",
                    "CVE_data_meta": { "ID": "CVE-2018-11053", "ASSIGNER": "secure@dell.com" },
                    "problemtype": { "problemtype_data": [{ "description": [{ "lang": "en", "value": "CWE-732" }] }] },
                    "references": {
                        "reference_data": [{
                            "url": "http://www.dell.com/support/article/us/en/19/sln310281/ism-dell-emc-idrac-service-module-improper-file-permission-vulnerability?lang=en",
                            "name": "http://www.dell.com/support/article/us/en/19/sln310281/ism-dell-emc-idrac-service-module-improper-file-permission-vulnerability?lang=en",
                            "refsource": "MISC",
                            "tags": ["Patch", "Vendor Advisory"]
                        }, {
                            "url": "http://www.securityfocus.com/bid/104567",
                            "name": "104567",
                            "refsource": "BID",
                            "tags": ["Third Party Advisory", "VDB Entry"]
                        }]
                    },
                    "description": {
                        "description_data": [{
                            "lang": "en",
                            "value": "Dell EMC iDRAC Service Module for all supported Linux and XenServer versions v3.0.1, v3.0.2, v3.1.0, v3.2.0, when started, changes the default file permission of the hosts file of the host operating system (/etc/hosts) to world writable. A malicious low privileged operating system user or process could modify the host file and potentially redirect traffic from the intended destination to sites hosting malicious or unwanted content."
                        }]
                    }
                },
                "configurations": {
                    "CVE_data_version": "4.0", "nodes": [{
                        "operator": "AND",
                        "children": [{
                            "operator": "OR",
                            "children": [],
                            "cpe_match": [{
                                "vulnerable": true,
                                "cpe23Uri": "cpe:2.3:a:dell:emc_idrac_service_module:3.0.1:*:*:*:*:*:*:*",
                                "cpe_name": []
                            }, {
                                "vulnerable": true,
                                "cpe23Uri": "cpe:2.3:a:dell:emc_idrac_service_module:3.0.2:*:*:*:*:*:*:*",
                                "cpe_name": []
                            }, {
                                "vulnerable": true,
                                "cpe23Uri": "cpe:2.3:a:dell:emc_idrac_service_module:3.1.0:*:*:*:*:*:*:*",
                                "cpe_name": []
                            }, {
                                "vulnerable": true,
                                "cpe23Uri": "cpe:2.3:a:dell:emc_idrac_service_module:3.2.0:*:*:*:*:*:*:*",
                                "cpe_name": []
                            }]
                        }, {
                            "operator": "OR",
                            "children": [],
                            "cpe_match": [{
                                "vulnerable": false,
                                "cpe23Uri": "cpe:2.3:a:citrix:xenserver:7.1:*:*:*:*:*:*:*",
                                "cpe_name": []
                            }, {
                                "vulnerable": false,
                                "cpe23Uri": "cpe:2.3:o:redhat:enterprise_linux:6.9:*:*:*:*:*:*:*",
                                "cpe_name": []
                            }, {
                                "vulnerable": false,
                                "cpe23Uri": "cpe:2.3:o:redhat:enterprise_linux:7.4:*:*:*:*:*:*:*",
                                "cpe_name": []
                            }, {
                                "vulnerable": false,
                                "cpe23Uri": "cpe:2.3:o:suse:suse_linux_enterprise_server:11:sp4:*:*:*:*:*:*",
                                "cpe_name": []
                            }, {
                                "vulnerable": false,
                                "cpe23Uri": "cpe:2.3:o:suse:suse_linux_enterprise_server:12:sp3:*:*:*:*:*:*",
                                "cpe_name": []
                            }]
                        }],
                        "cpe_match": []
                    }]
                },
                "impact": {
                    "baseMetricV3": {
                        "cvssV3": {
                            "version": "3.1",
                            "vectorString": "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N",
                            "attackVector": "NETWORK",
                            "attackComplexity": "LOW",
                            "privilegesRequired": "LOW",
                            "userInteraction": "NONE",
                            "scope": "UNCHANGED",
                            "confidentialityImpact": "NONE",
                            "integrityImpact": "HIGH",
                            "availabilityImpact": "NONE",
                            "baseScore": 6.5,
                            "baseSeverity": "MEDIUM"
                        }, "exploitabilityScore": 2.8, "impactScore": 3.6
                    },
                    "baseMetricV2": {
                        "cvssV2": {
                            "version": "2.0",
                            "vectorString": "AV:N/AC:L/Au:S/C:N/I:P/A:N",
                            "accessVector": "NETWORK",
                            "accessComplexity": "LOW",
                            "authentication": "SINGLE",
                            "confidentialityImpact": "NONE",
                            "integrityImpact": "PARTIAL",
                            "availabilityImpact": "NONE",
                            "baseScore": 4.0
                        },
                        "severity": "MEDIUM",
                        "exploitabilityScore": 8.0,
                        "impactScore": 2.9,
                        "obtainAllPrivilege": false,
                        "obtainUserPrivilege": false,
                        "obtainOtherPrivilege": false,
                        "userInteractionRequired": false
                    }
                },
                "publishedDate": "2018-06-26T22:29Z",
                "lastModifiedDate": "2021-06-10T12:46Z"
            }]
        }
    }
}



export const Top10CVE = {
    data: [
        {
            "CVEs": "CVE-1999-0524",
            "Count": 20,
            "FirstDiscovered": "06/09/21",
            "Impacted": "Low"
        },
        {
            "CVEs": "CVE-2012-0053",
            "Count": 16,
            "FirstDiscovered": "06/09/21",
            "Impacted": "Critical"

        },
        {
            "CVEs": "CVE-2013-2566",
            "Count": 15,
            "FirstDiscovered": "06/09/21",
            "Impacted": "High"
        },
        {
            "CVEs": "CVE-2016-2183",
            "Count": 15,
            "FirstDiscovered": "06/09/21",
            "Impacted": "High"
        },
        {
            "CVEs": "CVE-2016-0800",
            "Count": 12,
            "FirstDiscovered": "06/29/21",
            "Impacted": "Medium"
        },
        {
            "CVEs": "CVE-2014-3566",
            "Count": 8,
            "FirstDiscovered": "06/29/21",
            "Impacted": "Medium"
        },
        {
            "CVEs": "CVE-2001-0361",
            "Count": 5,
            "FirstDiscovered": "06/01/21",
            "Impacted": "High"
        },
        {
            "CVEs": "CVE-2014-0224",
            "Count": 4,
            "FirstDiscovered": "06/01/21",
            "Impacted": "Medium"
        },
        {
            "CVEs": "CVE-2011-4969",
            "Count": 3,
            "FirstDiscovered": "06/09/21",
            "Impacted": "Medium"
        },
        {
            "CVEs": "CVE-2012-4929",
            "Count": 3,
            "FirstDiscovered": "06/09/21",
            "Impacted": "High"
        }
    ]
}

export const SixlayerData = {
    SixLayersGraphData: [
        {
            "id": 0,
            "Cat": "Recovery",
            "Percent": 9,
            "labelTransform": "translate(74 200)",
            "valueLabel": "translate(151 206)"
        },
        {
            "id": 1,
            "Cat": "Defence",
            "Percent": 15,
            "labelTransform": "translate(119 111)",
            "valueLabel": "translate(209.087 183.555)"
        },
        {
            "id": 2,
            "Cat": "Governance",
            "Percent": 35,
            "labelTransform": "translate(265 282)",
            "valueLabel": "translate(233.087 264.555)"
        },
        {
            "id": 3,
            "Cat": "Risk Mitigation",
            "Percent": 55,
            "labelTransform": "translate(164 293)",
            "valueLabel": "translate(168.087 280.555)"
        },
        {
            "id": 4,
            "Cat": "Asset Management",
            "Percent": 75,
            "labelTransform": "translate(330 244)",
            "valueLabel": "translate(254 214)"
        },
        {
            "id": 5,
            "Cat": "Business Continuity",
            "Percent": 85,
            "labelTransform": "translate(43 278)",
            "valueLabel": "translate(130 248)"
        }
    ]
}

export const Governance = {
    GovernanceSearchData:
        [
            {
                "Compliance": "ISO27002",
                "SARAControl": 1,
                "SARASafeguard": 1.1,
                "AssetType": "Devices",
                "SecurityFunction": "Identify",
                "Title": "Establish and Maintain Detailed Enterprise Asset Inventory",
                "Description": "Establish and maintain an accurate, detailed, and up-to-date inventory of all enterprise assets with the potential to store or process data, to include: end-user devices (including portable and mobile), network devices, non-computing/IoT devices, and servers. Ensure the inventory records the network address (if static), hardware address, machine name, enterprise asset owner, department for each asset, and whether the asset has been approved to connect to the network. For mobile end-user devices, MDM type tools can support this process, where appropriate. This inventory includes assets connected to the infrastructure physically, virtually, remotely, and those within cloud environments. Additionally, it includes assets that are regularly connected to the enterprise’s network infrastructure, even if they are not under control of the enterprise. Review and update the inventory of all enterprise assets bi-annually, or more frequently.",
                "Relationship": "Subset",
                "Control": 5.9,
                "ControlTitle": "Inventory of information and other associated assets",
                "ControlText": "An inventory of information and other associated assets, including owners, should be developed and maintained."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 1,
                "SARASafeguard": 1.1,
                "AssetType": "Devices",
                "SecurityFunction": "Identify",
                "Title": "Establish and Maintain Detailed Enterprise Asset Inventory",
                "Description": "Establish and maintain an accurate, detailed, and up-to-date inventory of all enterprise assets with the potential to store or process data, to include: end-user devices (including portable and mobile), network devices, non-computing/IoT devices, and servers. Ensure the inventory records the network address (if static), hardware address, machine name, enterprise asset owner, department for each asset, and whether the asset has been approved to connect to the network. For mobile end-user devices, MDM type tools can support this process, where appropriate. This inventory includes assets connected to the infrastructure physically, virtually, remotely, and those within cloud environments. Additionally, it includes assets that are regularly connected to the enterprise’s network infrastructure, even if they are not under control of the enterprise. Review and update the inventory of all enterprise assets bi-annually, or more frequently.",
                "Relationship": "Subset",
                "Control": 8.1,
                "ControlTitle": "User endpoint devices",
                "ControlText": "Information stored on, processed by or accessible via user endpoint devices should be protected."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 1,
                "SARASafeguard": 1.1,
                "AssetType": "Devices",
                "SecurityFunction": "Identify",
                "Title": "Establish and Maintain Detailed Enterprise Asset Inventory",
                "Description": "Establish and maintain an accurate, detailed, and up-to-date inventory of all enterprise assets with the potential to store or process data, to include: end-user devices (including portable and mobile), network devices, non-computing/IoT devices, and servers. Ensure the inventory records the network address (if static), hardware address, machine name, enterprise asset owner, department for each asset, and whether the asset has been approved to connect to the network. For mobile end-user devices, MDM type tools can support this process, where appropriate. This inventory includes assets connected to the infrastructure physically, virtually, remotely, and those within cloud environments. Additionally, it includes assets that are regularly connected to the enterprise’s network infrastructure, even if they are not under control of the enterprise. Review and update the inventory of all enterprise assets bi-annually, or more frequently.",
                "Relationship": "Subset",
                "Control": 8.8,
                "ControlTitle": "Management of technical vulnerabilities",
                "ControlText": "Information about technical vulnerabilities of information systems in use should be obtained, the organization’s exposure to such vulnerabilities should be evaluated and appropriate measures should be taken."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 1,
                "SARASafeguard": 1.2,
                "AssetType": "Devices",
                "SecurityFunction": "Respond",
                "Title": "Address Unauthorized Assets",
                "Description": "Ensure that a process exists to address unauthorized assets on a weekly basis. The enterprise may choose to remove the asset from the network, deny the asset from connecting remotely to the network, or quarantine the asset.",
                "Relationship": "",
                "Control": "",
                "ControlTitle": "",
                "ControlText": ""
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 1,
                "SARASafeguard": 1.3,
                "AssetType": "Devices",
                "SecurityFunction": "Detect",
                "Title": "Utilize an Active Discovery Tool",
                "Description": "Utilize an active discovery tool to identify assets connected to the enterprise’s network. Configure the active discovery tool to execute daily, or more frequently.",
                "Relationship": "",
                "Control": "",
                "ControlTitle": "",
                "ControlText": ""
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 1,
                "SARASafeguard": 1.4,
                "AssetType": "Devices",
                "SecurityFunction": "Identify",
                "Title": "Use Dynamic Host Configuration Protocol (DHCP) Logging to Update Enterprise Asset Inventory",
                "Description": "Use DHCP logging on all DHCP servers or Internet Protocol (IP) address management tools to update the enterprise’s asset inventory. Review and use logs to update the enterprise’s asset inventory weekly, or more frequently.",
                "Relationship": "",
                "Control": "",
                "ControlTitle": "",
                "ControlText": ""
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 1,
                "SARASafeguard": 1.5,
                "AssetType": "Devices",
                "SecurityFunction": "Detect",
                "Title": "Use a Passive Asset Discovery Tool",
                "Description": "Use a passive discovery tool to identify assets connected to the enterprise’s network. Review and use scans to update the enterprise’s asset inventory at least weekly, or more frequently.",
                "Relationship": "",
                "Control": "",
                "ControlTitle": "",
                "ControlText": ""
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 2,
                "SARASafeguard": 2.1,
                "AssetType": "Applications",
                "SecurityFunction": "Identify",
                "Title": "Establish and Maintain a Software Inventory",
                "Description": "Establish and maintain a detailed inventory of all licensed software installed on enterprise assets. The software inventory must document the title, publisher, initial install/use date, and business purpose for each entry; where appropriate, include the Uniform Resource Locator (URL), app store(s), version(s), deployment mechanism, and decommission date. Review and update the software inventory bi-annually, or more frequently.",
                "Relationship": "Subset",
                "Control": 5.9,
                "ControlTitle": "Inventory of information and other associated assets",
                "ControlText": "An inventory of information and other associated assets, including owners, should be developed and maintained."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 2,
                "SARASafeguard": 2.1,
                "AssetType": "Applications",
                "SecurityFunction": "Identify",
                "Title": "Establish and Maintain a Software Inventory",
                "Description": "Establish and maintain a detailed inventory of all licensed software installed on enterprise assets. The software inventory must document the title, publisher, initial install/use date, and business purpose for each entry; where appropriate, include the Uniform Resource Locator (URL), app store(s), version(s), deployment mechanism, and decommission date. Review and update the software inventory bi-annually, or more frequently.",
                "Relationship": "Subset",
                "Control": 8.19,
                "ControlTitle": "Installation of software on operational systems",
                "ControlText": "Procedures and measures should be implemented to securely manage software installation on operational systems."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 2,
                "SARASafeguard": 2.2,
                "AssetType": "Applications",
                "SecurityFunction": "Identify",
                "Title": "Ensure Authorized Software is Currently Supported",
                "Description": "Ensure that only currently supported software is designated as authorized in the software inventory for enterprise assets. If software is unsupported, yet necessary for the fulfillment of the enterprise’s mission, document an exception detailing mitigating controls and residual risk acceptance. For any unsupported software without an exception documentation, designate as unauthorized. Review the software list to verify software support at least monthly, or more frequently.",
                "Relationship": "Subset",
                "Control": 5.1,
                "ControlTitle": "Policies for information security",
                "ControlText": "Information security policy and topic-specific policies should be defined, approved by management, published, communicated to and acknowledged by relevant personnel and relevant interested parties, and reviewed at planned intervals and if significant changes occur."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 2,
                "SARASafeguard": 2.3,
                "AssetType": "Applications",
                "SecurityFunction": "Respond",
                "Title": "Address Unauthorized Software",
                "Description": "Ensure that unauthorized software is either removed from use on enterprise assets or receives a documented exception. Review monthly, or more frequently.",
                "Relationship": "Subset",
                "Control": 8.7,
                "ControlTitle": "Protection against malware",
                "ControlText": "Protection against malware should be implemented and supported by appropriate user awareness."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 2,
                "SARASafeguard": 2.4,
                "AssetType": "Applications",
                "SecurityFunction": "Detect",
                "Title": "Utilize Automated Software Inventory Tools",
                "Description": "Utilize software inventory tools, when possible, throughout the enterprise to automate the discovery and documentation of installed software.",
                "Relationship": "",
                "Control": "",
                "ControlTitle": "",
                "ControlText": ""
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 2,
                "SARASafeguard": 2.5,
                "AssetType": "Applications",
                "SecurityFunction": "Protect",
                "Title": "Allowlist Authorized Software",
                "Description": "Use technical controls, such as application allowlisting, to ensure that only authorized software can execute or be accessed. Reassess bi-annually, or more frequently.",
                "Relationship": "Subset",
                "Control": 8.1,
                "ControlTitle": "User endpoint devices",
                "ControlText": "Information stored on, processed by or accessible via user endpoint devices should be protected."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 2,
                "SARASafeguard": 2.5,
                "AssetType": "Applications",
                "SecurityFunction": "Protect",
                "Title": "Allowlist Authorized Software",
                "Description": "Use technical controls, such as application allowlisting, to ensure that only authorized software can execute or be accessed. Reassess bi-annually, or more frequently.",
                "Relationship": "Subset",
                "Control": 8.7,
                "ControlTitle": "Protection against malware",
                "ControlText": "Protection against malware should be implemented and supported by appropriate user awareness."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 2,
                "SARASafeguard": 2.5,
                "AssetType": "Applications",
                "SecurityFunction": "Protect",
                "Title": "Allowlist Authorized Software",
                "Description": "Use technical controls, such as application allowlisting, to ensure that only authorized software can execute or be accessed. Reassess bi-annually, or more frequently.",
                "Relationship": "Subset",
                "Control": 8.19,
                "ControlTitle": "Installation of software on operational systems",
                "ControlText": "Procedures and measures should be implemented to securely manage software installation on operational systems."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 2,
                "SARASafeguard": 2.6,
                "AssetType": "Applications",
                "SecurityFunction": "Protect",
                "Title": "Allowlist Authorized Libraries",
                "Description": "Use technical controls to ensure that only authorized software libraries, such as specific .dll, .ocx, .so, etc., files, are allowed to load into a system process. Block unauthorized libraries from loading into a system process. Reassess bi-annually, or more frequently.",
                "Relationship": "Subset",
                "Control": 8.8,
                "ControlTitle": "Management of technical vulnerabilities",
                "ControlText": "Information about technical vulnerabilities of information systems in use should be obtained, the organization’s exposure to such vulnerabilities should be evaluated and appropriate measures should be taken."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 2,
                "SARASafeguard": 2.6,
                "AssetType": "Applications",
                "SecurityFunction": "Protect",
                "Title": "Allowlist Authorized Libraries",
                "Description": "Use technical controls to ensure that only authorized software libraries, such as specific .dll, .ocx, .so, etc., files, are allowed to load into a system process. Block unauthorized libraries from loading into a system process. Reassess bi-annually, or more frequently.",
                "Relationship": "Subset",
                "Control": 8.19,
                "ControlTitle": "Installation of software on operational systems",
                "ControlText": "Procedures and measures should be implemented to securely manage software installation on operational systems."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 2,
                "SARASafeguard": 2.7,
                "AssetType": "Applications",
                "SecurityFunction": "Protect",
                "Title": "Allowlist Authorized Scripts",
                "Description": "Use technical controls, such as digital signatures and version control, to ensure that only authorized scripts, such as specific .ps1, .py, etc., files, are allowed to execute. Block unauthorized scripts from executing. Reassess bi-annually, or more frequently.",
                "Relationship": "",
                "Control": "",
                "ControlTitle": "",
                "ControlText": ""
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 3,
                "SARASafeguard": 3.1,
                "AssetType": "Data",
                "SecurityFunction": "Identify",
                "Title": "Establish and Maintain a Data Management Process",
                "Description": "Establish and maintain a data management process. In the process, address data sensitivity, data owner, handling of data, data retention limits, and disposal requirements, based on sensitivity and retention standards for the enterprise. Review and update documentation annually, or when significant enterprise changes occur that could impact this Safeguard.",
                "Relationship": "Subset",
                "Control": 5.1,
                "ControlTitle": "Policies for information security",
                "ControlText": "Information security policy and topic-specific policies should be defined, approved by management, published, communicated to and acknowledged by relevant personnel and relevant interested parties, and reviewed at planned intervals and if significant changes occur."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 3,
                "SARASafeguard": 3.1,
                "AssetType": "Data",
                "SecurityFunction": "Identify",
                "Title": "Establish and Maintain a Data Management Process",
                "Description": "Establish and maintain a data management process. In the process, address data sensitivity, data owner, handling of data, data retention limits, and disposal requirements, based on sensitivity and retention standards for the enterprise. Review and update documentation annually, or when significant enterprise changes occur that could impact this Safeguard.",
                "Relationship": "Subset",
                "Control": 5.1,
                "ControlTitle": "Acceptable use of information and other associated assets",
                "ControlText": "Rules for the acceptable use and procedures for handling information and other associated assets should be identified, documented and implemented."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 3,
                "SARASafeguard": 3.1,
                "AssetType": "Data",
                "SecurityFunction": "Identify",
                "Title": "Establish and Maintain a Data Management Process",
                "Description": "Establish and maintain a data management process. In the process, address data sensitivity, data owner, handling of data, data retention limits, and disposal requirements, based on sensitivity and retention standards for the enterprise. Review and update documentation annually, or when significant enterprise changes occur that could impact this Safeguard.",
                "Relationship": "Subset",
                "Control": 5.9,
                "ControlTitle": "Inventory of information and other associated assets",
                "ControlText": "An inventory of information and other associated assets, including owners, should be developed and maintained."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 3,
                "SARASafeguard": 3.1,
                "AssetType": "Data",
                "SecurityFunction": "Identify",
                "Title": "Establish and Maintain a Data Management Process",
                "Description": "Establish and maintain a data management process. In the process, address data sensitivity, data owner, handling of data, data retention limits, and disposal requirements, based on sensitivity and retention standards for the enterprise. Review and update documentation annually, or when significant enterprise changes occur that could impact this Safeguard.",
                "Relationship": "Subset",
                "Control": 5.11,
                "ControlTitle": "Return of assets",
                "ControlText": "Personnel and other interested parties as appropriate should return all the organization’s assets in their possession upon change or termination of their employment, contract or agreement."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 3,
                "SARASafeguard": 3.1,
                "AssetType": "Data",
                "SecurityFunction": "Identify",
                "Title": "Establish and Maintain a Data Management Process",
                "Description": "Establish and maintain a data management process. In the process, address data sensitivity, data owner, handling of data, data retention limits, and disposal requirements, based on sensitivity and retention standards for the enterprise. Review and update documentation annually, or when significant enterprise changes occur that could impact this Safeguard.",
                "Relationship": "Subset",
                "Control": 8.1,
                "ControlTitle": "User endpoint devices",
                "ControlText": "Information stored on, processed by or accessible via user endpoint devices should be protected."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 3,
                "SARASafeguard": 3.11,
                "AssetType": "Data",
                "SecurityFunction": "Protect",
                "Title": "Encrypt Sensitive Data at Rest",
                "Description": "Encrypt sensitive data at rest on servers, applications, and databases containing sensitive data. Storage-layer encryption, also known as server-side encryption, meets the minimum requirement of this Safeguard. Additional encryption methods may include application-layer encryption, also known as client-side encryption, where access to the data storage device(s) does not permit access to the plain-text data.",
                "Relationship": "Subset",
                "Control": 5.33,
                "ControlTitle": "Protection of records",
                "ControlText": "Records should be protected from loss, destruction, falsification, unauthorized access and unauthorized release."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 3,
                "SARASafeguard": 3.12,
                "AssetType": "Network",
                "SecurityFunction": "Protect",
                "Title": "Segment Data Processing and Storage Based on Sensitivity",
                "Description": "Segment data processing and storage based on the sensitivity of the data. Do not process sensitive data on enterprise assets intended for lower sensitivity data.",
                "Relationship": "Subset",
                "Control": 8.2,
                "ControlTitle": "Networks security",
                "ControlText": "Networks and network devices should be secured, managed and controlled to protect information in systems and applications."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 3,
                "SARASafeguard": 3.12,
                "AssetType": "Network",
                "SecurityFunction": "Protect",
                "Title": "Segment Data Processing and Storage Based on Sensitivity",
                "Description": "Segment data processing and storage based on the sensitivity of the data. Do not process sensitive data on enterprise assets intended for lower sensitivity data.",
                "Relationship": "Subset",
                "Control": 8.22,
                "ControlTitle": "Segregation of networks",
                "ControlText": "Groups of information services, users and information systems should be segregated in the organization’s networks."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 3,
                "SARASafeguard": 3.13,
                "AssetType": "Data",
                "SecurityFunction": "Protect",
                "Title": "Deploy a Data Loss Prevention Solution",
                "Description": "Implement an automated tool, such as a host-based Data Loss Prevention (DLP) tool to identify all sensitive data stored, processed, or transmitted through enterprise assets, including those located onsite or at a remote service provider, and update the enterprise's sensitive data inventory.",
                "Relationship": "Subset",
                "Control": 5.14,
                "ControlTitle": "Information transfer",
                "ControlText": "Information transfer rules, procedures, or agreements should be in place for all types of transfer facilities within the organization and between the organization and other parties."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 3,
                "SARASafeguard": 3.13,
                "AssetType": "Data",
                "SecurityFunction": "Protect",
                "Title": "Deploy a Data Loss Prevention Solution",
                "Description": "Implement an automated tool, such as a host-based Data Loss Prevention (DLP) tool to identify all sensitive data stored, processed, or transmitted through enterprise assets, including those located onsite or at a remote service provider, and update the enterprise's sensitive data inventory.",
                "Relationship": "Subset",
                "Control": 8.12,
                "ControlTitle": "Data leakage prevention",
                "ControlText": "Data leakage prevention measures should be applied to systems, networks and any other devices that process, store or transmit sensitive information."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 3,
                "SARASafeguard": 3.14,
                "AssetType": "Data",
                "SecurityFunction": "Detect",
                "Title": "Log Sensitive Data Access",
                "Description": "Log sensitive data access, including modification and disposal.",
                "Relationship": "Subset",
                "Control": 5.1,
                "ControlTitle": "Acceptable use of information and other associated assets",
                "ControlText": "Rules for the acceptable use and procedures for handling information and other associated assets should be identified, documented and implemented."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 3,
                "SARASafeguard": 3.14,
                "AssetType": "Data",
                "SecurityFunction": "Detect",
                "Title": "Log Sensitive Data Access",
                "Description": "Log sensitive data access, including modification and disposal.",
                "Relationship": "Subset",
                "Control": 8.15,
                "ControlTitle": "Logging",
                "ControlText": "Logs that record activities, exceptions, faults and other relevant events should be produced, stored, protected and analysed."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 3,
                "SARASafeguard": 3.2,
                "AssetType": "Data",
                "SecurityFunction": "Identify",
                "Title": "Establish and Maintain a Data Inventory",
                "Description": "Establish and maintain a data inventory, based on the enterprise’s data management process. Inventory sensitive data, at a minimum. Review and update inventory annually, at a minimum, with a priority on sensitive data.",
                "Relationship": "Subset",
                "Control": 5.9,
                "ControlTitle": "Inventory of information and other associated assets",
                "ControlText": "An inventory of information and other associated assets, including owners, should be developed and maintained."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 3,
                "SARASafeguard": 3.3,
                "AssetType": "Data",
                "SecurityFunction": "Protect",
                "Title": "Configure Data Access Control Lists",
                "Description": "Configure data access control lists based on a user’s need to know. Apply data access control lists, also known as access permissions, to local and remote file systems, databases, and applications.",
                "Relationship": "Subset",
                "Control": 5.1,
                "ControlTitle": "Acceptable use of information and other associated assets",
                "ControlText": "Rules for the acceptable use and procedures for handling information and other associated assets should be identified, documented and implemented."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 3,
                "SARASafeguard": 3.3,
                "AssetType": "Data",
                "SecurityFunction": "Protect",
                "Title": "Configure Data Access Control Lists",
                "Description": "Configure data access control lists based on a user’s need to know. Apply data access control lists, also known as access permissions, to local and remote file systems, databases, and applications.",
                "Relationship": "Subset",
                "Control": 5.15,
                "ControlTitle": "Access control",
                "ControlText": "Rules to control physical and logical access to information and other associated assets should be established and implemented based on business and information security requirements."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 3,
                "SARASafeguard": 3.3,
                "AssetType": "Data",
                "SecurityFunction": "Protect",
                "Title": "Configure Data Access Control Lists",
                "Description": "Configure data access control lists based on a user’s need to know. Apply data access control lists, also known as access permissions, to local and remote file systems, databases, and applications.",
                "Relationship": "Subset",
                "Control": 8.3,
                "ControlTitle": "Information access restriction",
                "ControlText": "Access to information and other associated assets should be restricted in accordance with the established topic-specific policy on access control."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 3,
                "SARASafeguard": 3.3,
                "AssetType": "Data",
                "SecurityFunction": "Protect",
                "Title": "Configure Data Access Control Lists",
                "Description": "Configure data access control lists based on a user’s need to know. Apply data access control lists, also known as access permissions, to local and remote file systems, databases, and applications.",
                "Relationship": "Subset",
                "Control": 8.4,
                "ControlTitle": "Access to source code",
                "ControlText": "Read and write access to source code, development tools and software libraries should be appropriately managed."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 3,
                "SARASafeguard": 3.4,
                "AssetType": "Data",
                "SecurityFunction": "Protect",
                "Title": "Enforce Data Retention",
                "Description": "Retain data according to the enterprise’s data management process. Data retention must include both minimum and maximum timelines.",
                "Relationship": "Subset",
                "Control": 5.14,
                "ControlTitle": "Information transfer",
                "ControlText": "Information transfer rules, procedures, or agreements should be in place for all types of transfer facilities within the organization and between the organization and other parties."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 3,
                "SARASafeguard": 3.4,
                "AssetType": "Data",
                "SecurityFunction": "Protect",
                "Title": "Enforce Data Retention",
                "Description": "Retain data according to the enterprise’s data management process. Data retention must include both minimum and maximum timelines.",
                "Relationship": "Subset",
                "Control": 5.33,
                "ControlTitle": "Protection of records",
                "ControlText": "Records should be protected from loss, destruction, falsification, unauthorized access and unauthorized release."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 3,
                "SARASafeguard": 3.5,
                "AssetType": "Data",
                "SecurityFunction": "Protect",
                "Title": "Securely Dispose of Data",
                "Description": "Securely dispose of data as outlined in the enterprise’s data management process. Ensure the disposal process and method are commensurate with the data sensitivity.",
                "Relationship": "Subset",
                "Control": 5.1,
                "ControlTitle": "Acceptable use of information and other associated assets",
                "ControlText": "Rules for the acceptable use and procedures for handling information and other associated assets should be identified, documented and implemented."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 3,
                "SARASafeguard": 3.5,
                "AssetType": "Data",
                "SecurityFunction": "Protect",
                "Title": "Securely Dispose of Data",
                "Description": "Securely dispose of data as outlined in the enterprise’s data management process. Ensure the disposal process and method are commensurate with the data sensitivity.",
                "Relationship": "Subset",
                "Control": 5.14,
                "ControlTitle": "Information transfer",
                "ControlText": "Information transfer rules, procedures, or agreements should be in place for all types of transfer facilities within the organization and between the organization and other parties."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 3,
                "SARASafeguard": 3.5,
                "AssetType": "Data",
                "SecurityFunction": "Protect",
                "Title": "Securely Dispose of Data",
                "Description": "Securely dispose of data as outlined in the enterprise’s data management process. Ensure the disposal process and method are commensurate with the data sensitivity.",
                "Relationship": "Subset",
                "Control": 7.1,
                "ControlTitle": "Storage media",
                "ControlText": "Storage media should be managed through its life cycle of acquisition, use, transportation and disposal in accordance with the organization’s classification scheme and handling requirements."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 3,
                "SARASafeguard": 3.5,
                "AssetType": "Data",
                "SecurityFunction": "Protect",
                "Title": "Securely Dispose of Data",
                "Description": "Securely dispose of data as outlined in the enterprise’s data management process. Ensure the disposal process and method are commensurate with the data sensitivity.",
                "Relationship": "Subset",
                "Control": 7.14,
                "ControlTitle": "Secure disposal or re-use of equipment",
                "ControlText": "Items of equipment containing storage media should be verified to ensure that any sensitive data and licensed software has been removed or securely overwritten prior to disposal or re-use."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 3,
                "SARASafeguard": 3.6,
                "AssetType": "Devices",
                "SecurityFunction": "Protect",
                "Title": "Encrypt Data on End-User Devices",
                "Description": "Encrypt data on end-user devices containing sensitive data. Example implementations can include: Windows BitLocker®, Apple FileVault®, Linux® dm-crypt.",
                "Relationship": "Subset",
                "Control": 6.7,
                "ControlTitle": "Remote working",
                "ControlText": "Security measures should be implemented when personnel are working remotely to protect information accessed, processed or stored outside the organization’s premises."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 3,
                "SARASafeguard": 3.6,
                "AssetType": "Devices",
                "SecurityFunction": "Protect",
                "Title": "Encrypt Data on End-User Devices",
                "Description": "Encrypt data on end-user devices containing sensitive data. Example implementations can include: Windows BitLocker®, Apple FileVault®, Linux® dm-crypt.",
                "Relationship": "Subset",
                "Control": 7.1,
                "ControlTitle": "Storage media",
                "ControlText": "Storage media should be managed through its life cycle of acquisition, use, transportation and disposal in accordance with the organization’s classification scheme and handling requirements."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 3,
                "SARASafeguard": 3.6,
                "AssetType": "Devices",
                "SecurityFunction": "Protect",
                "Title": "Encrypt Data on End-User Devices",
                "Description": "Encrypt data on end-user devices containing sensitive data. Example implementations can include: Windows BitLocker®, Apple FileVault®, Linux® dm-crypt.",
                "Relationship": "Subset",
                "Control": 7.14,
                "ControlTitle": "Secure disposal or re-use of equipment",
                "ControlText": "Items of equipment containing storage media should be verified to ensure that any sensitive data and licensed software has been removed or securely overwritten prior to disposal or re-use."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 3,
                "SARASafeguard": 3.6,
                "AssetType": "Devices",
                "SecurityFunction": "Protect",
                "Title": "Encrypt Data on End-User Devices",
                "Description": "Encrypt data on end-user devices containing sensitive data. Example implementations can include: Windows BitLocker®, Apple FileVault®, Linux® dm-crypt.",
                "Relationship": "Subset",
                "Control": 8.1,
                "ControlTitle": "User endpoint devices",
                "ControlText": "Information stored on, processed by or accessible via user endpoint devices should be protected."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 3,
                "SARASafeguard": 3.7,
                "AssetType": "Data",
                "SecurityFunction": "Identify",
                "Title": "Establish and Maintain a Data Classification Scheme",
                "Description": "Establish and maintain an overall data classification scheme for the enterprise. Enterprises may use labels, such as “Sensitive,” “Confidential,” and “Public,” and classify their data according to those labels. Review and update the classification scheme annually, or when significant enterprise changes occur that could impact this Safeguard.",
                "Relationship": "Subset",
                "Control": 5.9,
                "ControlTitle": "Inventory of information and other associated assets",
                "ControlText": "An inventory of information and other associated assets, including owners, should be developed and maintained."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 3,
                "SARASafeguard": 3.7,
                "AssetType": "Data",
                "SecurityFunction": "Identify",
                "Title": "Establish and Maintain a Data Classification Scheme",
                "Description": "Establish and maintain an overall data classification scheme for the enterprise. Enterprises may use labels, such as “Sensitive,” “Confidential,” and “Public,” and classify their data according to those labels. Review and update the classification scheme annually, or when significant enterprise changes occur that could impact this Safeguard.",
                "Relationship": "Subset",
                "Control": 5.12,
                "ControlTitle": "Classification of information",
                "ControlText": "Information should be classified according to the information security needs of the organization based on confidentiality, integrity, availability and relevant interested party requirements."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 3,
                "SARASafeguard": 3.7,
                "AssetType": "Data",
                "SecurityFunction": "Identify",
                "Title": "Establish and Maintain a Data Classification Scheme",
                "Description": "Establish and maintain an overall data classification scheme for the enterprise. Enterprises may use labels, such as “Sensitive,” “Confidential,” and “Public,” and classify their data according to those labels. Review and update the classification scheme annually, or when significant enterprise changes occur that could impact this Safeguard.",
                "Relationship": "Subset",
                "Control": 5.13,
                "ControlTitle": "Labelling of information",
                "ControlText": "An appropriate set of procedures for information labelling should be developed and implemented in accordance with the information classification scheme adopted by the organization."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 3,
                "SARASafeguard": 3.7,
                "AssetType": "Data",
                "SecurityFunction": "Identify",
                "Title": "Establish and Maintain a Data Classification Scheme",
                "Description": "Establish and maintain an overall data classification scheme for the enterprise. Enterprises may use labels, such as “Sensitive,” “Confidential,” and “Public,” and classify their data according to those labels. Review and update the classification scheme annually, or when significant enterprise changes occur that could impact this Safeguard.",
                "Relationship": "Subset",
                "Control": 5.33,
                "ControlTitle": "Protection of records",
                "ControlText": "Records should be protected from loss, destruction, falsification, unauthorized access and unauthorized release."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 3,
                "SARASafeguard": 3.7,
                "AssetType": "Data",
                "SecurityFunction": "Identify",
                "Title": "Establish and Maintain a Data Classification Scheme",
                "Description": "Establish and maintain an overall data classification scheme for the enterprise. Enterprises may use labels, such as “Sensitive,” “Confidential,” and “Public,” and classify their data according to those labels. Review and update the classification scheme annually, or when significant enterprise changes occur that could impact this Safeguard.",
                "Relationship": "Subset",
                "Control": 8.12,
                "ControlTitle": "Data leakage prevention",
                "ControlText": "Data leakage prevention measures should be applied to systems, networks and any other devices that process, store or transmit sensitive information."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 3,
                "SARASafeguard": 3.8,
                "AssetType": "Data",
                "SecurityFunction": "Identify",
                "Title": "Document Data Flows",
                "Description": "Document data flows. Data flow documentation includes service provider data flows and should be based on the enterprise’s data management process. Review and update documentation annually, or when significant enterprise changes occur that could impact this Safeguard.",
                "Relationship": "Subset",
                "Control": 5.14,
                "ControlTitle": "Information transfer",
                "ControlText": "Information transfer rules, procedures, or agreements should be in place for all types of transfer facilities within the organization and between the organization and other parties."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 3,
                "SARASafeguard": 3.9,
                "AssetType": "Data",
                "SecurityFunction": "Protect",
                "Title": "Encrypt Data on Removable Media",
                "Description": "Encrypt data on removable media.",
                "Relationship": "Subset",
                "Control": 5.14,
                "ControlTitle": "Information transfer",
                "ControlText": "Information transfer rules, procedures, or agreements should be in place for all types of transfer facilities within the organization and between the organization and other parties."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 3,
                "SARASafeguard": 3.9,
                "AssetType": "Data",
                "SecurityFunction": "Protect",
                "Title": "Encrypt Data on Removable Media",
                "Description": "Encrypt data on removable media.",
                "Relationship": "Subset",
                "Control": 7.1,
                "ControlTitle": "Storage media",
                "ControlText": "Storage media should be managed through its life cycle of acquisition, use, transportation and disposal in accordance with the organization’s classification scheme and handling requirements."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 4,
                "SARASafeguard": 4.1,
                "AssetType": "Applications",
                "SecurityFunction": "Protect",
                "Title": "Establish and Maintain a Secure Configuration Process",
                "Description": "Establish and maintain a secure configuration process for enterprise assets (end-user devices, including portable and mobile, non-computing/IoT devices, and servers) and software (operating systems and applications). Review and update documentation annually, or when significant enterprise changes occur that could impact this Safeguard.",
                "Relationship": "Subset",
                "Control": 8.1,
                "ControlTitle": "User endpoint devices",
                "ControlText": "Information stored on, processed by or accessible via user endpoint devices should be protected."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 4,
                "SARASafeguard": 4.1,
                "AssetType": "Applications",
                "SecurityFunction": "Protect",
                "Title": "Establish and Maintain a Secure Configuration Process",
                "Description": "Establish and maintain a secure configuration process for enterprise assets (end-user devices, including portable and mobile, non-computing/IoT devices, and servers) and software (operating systems and applications). Review and update documentation annually, or when significant enterprise changes occur that could impact this Safeguard.",
                "Relationship": "Subset",
                "Control": 8.9,
                "ControlTitle": "Configuration management",
                "ControlText": "Configurations, including security configurations, of hardware, software, services and networks should be established, documented, implemented, monitored and reviewed."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 4,
                "SARASafeguard": 4.11,
                "AssetType": "Devices",
                "SecurityFunction": "Protect",
                "Title": "Enforce Remote Wipe Capability on Portable End-User Devices",
                "Description": "Remotely wipe enterprise data from enterprise-owned portable end-user devices when deemed appropriate such as lost or stolen devices, or when an individual no longer supports the enterprise.",
                "Relationship": "Subset",
                "Control": 8.1,
                "ControlTitle": "User endpoint devices",
                "ControlText": "Information stored on, processed by or accessible via user endpoint devices should be protected."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 4,
                "SARASafeguard": 4.12,
                "AssetType": "Devices",
                "SecurityFunction": "Protect",
                "Title": "Separate Enterprise Workspaces on Mobile End-User Devices",
                "Description": "Ensure separate enterprise workspaces are used on mobile end-user devices, where supported. Example implementations include using an Apple® Configuration Profile or Android™ Work Profile to separate enterprise applications and data from personal applications and data.",
                "Relationship": "Subset",
                "Control": 6.7,
                "ControlTitle": "Remote working",
                "ControlText": "Security measures should be implemented when personnel are working remotely to protect information accessed, processed or stored outside the organization’s premises."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 4,
                "SARASafeguard": 4.12,
                "AssetType": "Devices",
                "SecurityFunction": "Protect",
                "Title": "Separate Enterprise Workspaces on Mobile End-User Devices",
                "Description": "Ensure separate enterprise workspaces are used on mobile end-user devices, where supported. Example implementations include using an Apple® Configuration Profile or Android™ Work Profile to separate enterprise applications and data from personal applications and data.",
                "Relationship": "Subset",
                "Control": 8.1,
                "ControlTitle": "User endpoint devices",
                "ControlText": "Information stored on, processed by or accessible via user endpoint devices should be protected."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 4,
                "SARASafeguard": 4.2,
                "AssetType": "Network",
                "SecurityFunction": "Protect",
                "Title": "Establish and Maintain a Secure Configuration Process for Network Infrastructure",
                "Description": "Establish and maintain a secure configuration process for network devices. Review and update documentation annually, or when significant enterprise changes occur that could impact this Safeguard.",
                "Relationship": "Subset",
                "Control": 8.9,
                "ControlTitle": "Configuration management",
                "ControlText": "Configurations, including security configurations, of hardware, software, services and networks should be established, documented, implemented, monitored and reviewed."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 4,
                "SARASafeguard": 4.3,
                "AssetType": "Users",
                "SecurityFunction": "Protect",
                "Title": "Configure Automatic Session Locking on Enterprise Assets",
                "Description": "Configure automatic session locking on enterprise assets after a defined period of inactivity. For general purpose operating systems, the period must not exceed 15 minutes. For mobile end-user devices, the period must not exceed 2 minutes.",
                "Relationship": "Subset",
                "Control": 8.5,
                "ControlTitle": "Secure authentication",
                "ControlText": "Secure authentication technologies and procedures should be implemented based on information access restrictions and the topic-specific policy on access control."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 4,
                "SARASafeguard": 4.3,
                "AssetType": "Users",
                "SecurityFunction": "Protect",
                "Title": "Configure Automatic Session Locking on Enterprise Assets",
                "Description": "Configure automatic session locking on enterprise assets after a defined period of inactivity. For general purpose operating systems, the period must not exceed 15 minutes. For mobile end-user devices, the period must not exceed 2 minutes.",
                "Relationship": "Subset",
                "Control": 8.9,
                "ControlTitle": "Configuration management",
                "ControlText": "Configurations, including security configurations, of hardware, software, services and networks should be established, documented, implemented, monitored and reviewed."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 4,
                "SARASafeguard": 4.4,
                "AssetType": "Devices",
                "SecurityFunction": "Protect",
                "Title": "Implement and Manage a Firewall on Servers",
                "Description": "Implement and manage a firewall on servers, where supported. Example implementations include a virtual firewall, operating system firewall, or a third-party firewall agent.",
                "Relationship": "",
                "Control": "",
                "ControlTitle": "",
                "ControlText": ""
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 4,
                "SARASafeguard": 4.5,
                "AssetType": "Devices",
                "SecurityFunction": "Protect",
                "Title": "Implement and Manage a Firewall on End-User Devices",
                "Description": "Implement and manage a host-based firewall or port-filtering tool on end-user devices, with a default-deny rule that drops all traffic except those services and ports that are explicitly allowed.",
                "Relationship": "Subset",
                "Control": 8.1,
                "ControlTitle": "User endpoint devices",
                "ControlText": "Information stored on, processed by or accessible via user endpoint devices should be protected."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 4,
                "SARASafeguard": 4.6,
                "AssetType": "Network",
                "SecurityFunction": "Protect",
                "Title": "Securely Manage Enterprise Assets and Software",
                "Description": "Securely manage enterprise assets and software. Example implementations include managing configuration through version-controlled-infrastructure-as-code and accessing administrative interfaces over secure network protocols, such as Secure Shell (SSH) and Hypertext Transfer Protocol Secure (HTTPS). Do not use insecure management protocols, such as Telnet (Teletype Network) and HTTP, unless operationally essential.",
                "Relationship": "Subset",
                "Control": 8.19,
                "ControlTitle": "Installation of software on operational systems",
                "ControlText": "Procedures and measures should be implemented to securely manage software installation on operational systems."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 4,
                "SARASafeguard": 4.7,
                "AssetType": "Users",
                "SecurityFunction": "Protect",
                "Title": "Manage Default Accounts on Enterprise Assets and Software",
                "Description": "Manage default accounts on enterprise assets and software, such as root, administrator, and other pre-configured vendor accounts. Example implementations can include: disabling default accounts or making them unusable.",
                "Relationship": "Subset",
                "Control": 8.9,
                "ControlTitle": "Configuration management",
                "ControlText": "Configurations, including security configurations, of hardware, software, services and networks should be established, documented, implemented, monitored and reviewed."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 4,
                "SARASafeguard": 4.7,
                "AssetType": "Users",
                "SecurityFunction": "Protect",
                "Title": "Manage Default Accounts on Enterprise Assets and Software",
                "Description": "Manage default accounts on enterprise assets and software, such as root, administrator, and other pre-configured vendor accounts. Example implementations can include: disabling default accounts or making them unusable.",
                "Relationship": "Subset",
                "Control": 8.2,
                "ControlTitle": "Privileged access rights",
                "ControlText": "The allocation and use of privileged access rights should be restricted and managed."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 4,
                "SARASafeguard": 4.8,
                "AssetType": "Devices",
                "SecurityFunction": "Protect",
                "Title": "Uninstall or Disable Unnecessary Services on Enterprise Assets and Software",
                "Description": "Uninstall or disable unnecessary services on enterprise assets and software, such as an unused file sharing service, web application module, or service function.",
                "Relationship": "Subset",
                "Control": 8.9,
                "ControlTitle": "Configuration management",
                "ControlText": "Configurations, including security configurations, of hardware, software, services and networks should be established, documented, implemented, monitored and reviewed."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 4,
                "SARASafeguard": 4.9,
                "AssetType": "Devices",
                "SecurityFunction": "Protect",
                "Title": "Configure Trusted DNS Servers on Enterprise Assets",
                "Description": "Configure trusted DNS servers on enterprise assets. Example implementations include: configuring assets to use enterprise-controlled DNS servers and/or reputable externally accessible DNS servers.",
                "Relationship": "",
                "Control": "",
                "ControlTitle": "",
                "ControlText": ""
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 5,
                "SARASafeguard": 5.1,
                "AssetType": "Users",
                "SecurityFunction": "Identify",
                "Title": "Establish and Maintain an Inventory of Accounts",
                "Description": "Establish and maintain an inventory of all accounts managed in the enterprise. The inventory must include both user and administrator accounts. The inventory, at a minimum, should contain the person’s name, username, start/stop dates, and department. Validate that all active accounts are authorized, on a recurring schedule at a minimum quarterly, or more frequently.",
                "Relationship": "Subset",
                "Control": 8.15,
                "ControlTitle": "Logging",
                "ControlText": "Logs that record activities, exceptions, faults and other relevant events should be produced, stored, protected and analysed."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 5,
                "SARASafeguard": 5.2,
                "AssetType": "Users",
                "SecurityFunction": "Protect",
                "Title": "Use Unique Passwords",
                "Description": "Use unique passwords for all enterprise assets. Best practice implementation includes, at a minimum, an 8-character password for accounts using MFA and a 14-character password for accounts not using MFA.",
                "Relationship": "Subset",
                "Control": 5.17,
                "ControlTitle": "Authentication information",
                "ControlText": "Allocation and management of authentication information should be controlled by a management process, including advising personnel of appropriate handling of authentication information."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 5,
                "SARASafeguard": 5.3,
                "AssetType": "Users",
                "SecurityFunction": "Respond",
                "Title": "Disable Dormant Accounts",
                "Description": "Delete or disable any dormant accounts after a period of 45 days of inactivity, where supported.",
                "Relationship": "Subset",
                "Control": 5.16,
                "ControlTitle": "Identity management",
                "ControlText": "Personnel and other interested parties as appropriate should return all the organization’s assets in their possession upon change or termination of their employment, contract or agreement."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 5,
                "SARASafeguard": 5.4,
                "AssetType": "Users",
                "SecurityFunction": "Protect",
                "Title": "Restrict Administrator Privileges to Dedicated Administrator Accounts",
                "Description": "Restrict administrator privileges to dedicated administrator accounts on enterprise assets. Conduct general computing activities, such as internet browsing, email, and productivity suite use, from the user’s primary, non-privileged account.",
                "Relationship": "Subset",
                "Control": 5.15,
                "ControlTitle": "Access control",
                "ControlText": "Rules to control physical and logical access to information and other associated assets should be established and implemented based on business and information security requirements."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 5,
                "SARASafeguard": 5.4,
                "AssetType": "Users",
                "SecurityFunction": "Protect",
                "Title": "Restrict Administrator Privileges to Dedicated Administrator Accounts",
                "Description": "Restrict administrator privileges to dedicated administrator accounts on enterprise assets. Conduct general computing activities, such as internet browsing, email, and productivity suite use, from the user’s primary, non-privileged account.",
                "Relationship": "Subset",
                "Control": 8.2,
                "ControlTitle": "Privileged access rights",
                "ControlText": "The allocation and use of privileged access rights should be restricted and managed."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 5,
                "SARASafeguard": 5.5,
                "AssetType": "Users",
                "SecurityFunction": "Identify",
                "Title": "Establish and Maintain an Inventory of Service Accounts",
                "Description": "Establish and maintain an inventory of service accounts. The inventory, at a minimum, must contain department owner, review date, and purpose. Perform service account reviews to validate that all active accounts are authorized, on a recurring schedule at a minimum quarterly, or more frequently.",
                "Relationship": "Subset",
                "Control": 5.15,
                "ControlTitle": "Access control",
                "ControlText": "Rules to control physical and logical access to information and other associated assets should be established and implemented based on business and information security requirements."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 5,
                "SARASafeguard": 5.5,
                "AssetType": "Users",
                "SecurityFunction": "Identify",
                "Title": "Establish and Maintain an Inventory of Service Accounts",
                "Description": "Establish and maintain an inventory of service accounts. The inventory, at a minimum, must contain department owner, review date, and purpose. Perform service account reviews to validate that all active accounts are authorized, on a recurring schedule at a minimum quarterly, or more frequently.",
                "Relationship": "Subset",
                "Control": 8.18,
                "ControlTitle": "Use of privileged utility programs",
                "ControlText": "The use of utility programs that can be capable of overriding system and application controls should be restricted and tightly controlled."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 5,
                "SARASafeguard": 5.6,
                "AssetType": "Users",
                "SecurityFunction": "Protect",
                "Title": "Centralize Account Management",
                "Description": "Centralize account management through a directory or identity service.",
                "Relationship": "",
                "Control": "",
                "ControlTitle": "",
                "ControlText": ""
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 6,
                "SARASafeguard": 6.1,
                "AssetType": "Users",
                "SecurityFunction": "Protect",
                "Title": "Establish an Access Granting Process",
                "Description": "Establish and follow a process, preferably automated, for granting access to enterprise assets upon new hire, rights grant, or role change of a user.",
                "Relationship": "Subset",
                "Control": 5.16,
                "ControlTitle": "Identity management",
                "ControlText": "The full life cycle of identities should be managed."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 6,
                "SARASafeguard": 6.1,
                "AssetType": "Users",
                "SecurityFunction": "Protect",
                "Title": "Establish an Access Granting Process",
                "Description": "Establish and follow a process, preferably automated, for granting access to enterprise assets upon new hire, rights grant, or role change of a user.",
                "Relationship": "Subset",
                "Control": 5.18,
                "ControlTitle": "Access rights",
                "ControlText": "Access rights to information and other associated assets should be provisioned, reviewed, modified and removed in accordance with the organization’s topic-specific policy on and rules for access control."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 6,
                "SARASafeguard": 6.2,
                "AssetType": "Users",
                "SecurityFunction": "Protect",
                "Title": "Establish an Access Revoking Process",
                "Description": "Establish and follow a process, preferably automated, for revoking access to enterprise assets, through disabling accounts immediately upon termination, rights revocation, or role change of a user. Disabling accounts, instead of deleting accounts, may be necessary to preserve audit trails.",
                "Relationship": "Subset",
                "Control": 5.11,
                "ControlTitle": "Return of assets",
                "ControlText": "Personnel and other interested parties as appropriate should return all the organization’s assets in their possession upon change or termination of their employment, contract or agreement."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 6,
                "SARASafeguard": 6.2,
                "AssetType": "Users",
                "SecurityFunction": "Protect",
                "Title": "Establish an Access Revoking Process",
                "Description": "Establish and follow a process, preferably automated, for revoking access to enterprise assets, through disabling accounts immediately upon termination, rights revocation, or role change of a user. Disabling accounts, instead of deleting accounts, may be necessary to preserve audit trails.",
                "Relationship": "Subset",
                "Control": 5.16,
                "ControlTitle": "Identity management",
                "ControlText": "Personnel and other interested parties as appropriate should return all the organization’s assets in their possession upon change or termination of their employment, contract or agreement."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 6,
                "SARASafeguard": 6.2,
                "AssetType": "Users",
                "SecurityFunction": "Protect",
                "Title": "Establish an Access Revoking Process",
                "Description": "Establish and follow a process, preferably automated, for revoking access to enterprise assets, through disabling accounts immediately upon termination, rights revocation, or role change of a user. Disabling accounts, instead of deleting accounts, may be necessary to preserve audit trails.",
                "Relationship": "Subset",
                "Control": 5.18,
                "ControlTitle": "Access rights",
                "ControlText": "Access rights to information and other associated assets should be provisioned, reviewed, modified and removed in accordance with the organization’s topic-specific policy on and rules for access control."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 6,
                "SARASafeguard": 6.2,
                "AssetType": "Users",
                "SecurityFunction": "Protect",
                "Title": "Establish an Access Revoking Process",
                "Description": "Establish and follow a process, preferably automated, for revoking access to enterprise assets, through disabling accounts immediately upon termination, rights revocation, or role change of a user. Disabling accounts, instead of deleting accounts, may be necessary to preserve audit trails.",
                "Relationship": "Subset",
                "Control": 6.5,
                "ControlTitle": "Responsibilities after termination or change of employment",
                "ControlText": "Information security responsibilities and duties that remain valid after termination or change of employment should be defined, enforced and communicated to relevant personnel and other interested parties."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 6,
                "SARASafeguard": 6.3,
                "AssetType": "Users",
                "SecurityFunction": "Protect",
                "Title": "Require MFA for Externally-Exposed Applications",
                "Description": "Require all externally-exposed enterprise or third-party applications to enforce MFA, where supported. Enforcing MFA through a directory service or SSO provider is a satisfactory implementation of this Safeguard.",
                "Relationship": "",
                "Control": "",
                "ControlTitle": "",
                "ControlText": ""
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 6,
                "SARASafeguard": 6.4,
                "AssetType": "Users",
                "SecurityFunction": "Protect",
                "Title": "Require MFA for Remote Network Access",
                "Description": "Require MFA for remote network access.",
                "Relationship": "Subset",
                "Control": 6.7,
                "ControlTitle": "Remote working",
                "ControlText": "Security measures should be implemented when personnel are working remotely to protect information accessed, processed or stored outside the organization’s premises."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 6,
                "SARASafeguard": 6.5,
                "AssetType": "Users",
                "SecurityFunction": "Protect",
                "Title": "Require MFA for Administrative Access",
                "Description": "Require MFA for all administrative access accounts, where supported, on all enterprise assets, whether managed on-site or through a third-party provider.",
                "Relationship": "Subset",
                "Control": 8.2,
                "ControlTitle": "Privileged access rights",
                "ControlText": "The allocation and use of privileged access rights should be restricted and managed."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 6,
                "SARASafeguard": 6.6,
                "AssetType": "Users",
                "SecurityFunction": "Identify",
                "Title": "Establish and Maintain an Inventory of Authentication and Authorization Systems",
                "Description": "Establish and maintain an inventory of the enterprise’s authentication and authorization systems, including those hosted on-site or at a remote service provider. Review and update the inventory, at a minimum, annually, or more frequently.",
                "Relationship": "Subset",
                "Control": 8.5,
                "ControlTitle": "Secure authentication",
                "ControlText": "Secure authentication technologies and procedures should be implemented based on information access restrictions and the topic-specific policy on access control."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 6,
                "SARASafeguard": 6.7,
                "AssetType": "Users",
                "SecurityFunction": "Protect",
                "Title": "Centralize Access Control",
                "Description": "Centralize access control for all enterprise assets through a directory service or SSO provider, where supported.",
                "Relationship": "Subset",
                "Control": 5.18,
                "ControlTitle": "Access rights",
                "ControlText": "Access rights to information and other associated assets should be provisioned, reviewed, modified and removed in accordance with the organization’s topic-specific policy on and rules for access control."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 6,
                "SARASafeguard": 6.8,
                "AssetType": "Data",
                "SecurityFunction": "Protect",
                "Title": "Define and Maintain Role-Based Access Control",
                "Description": "Define and maintain role-based access control, through determining and documenting the access rights necessary for each role within the enterprise to successfully carry out its assigned duties. Perform access control reviews of enterprise assets to validate that all privileges are authorized, on a recurring schedule at a minimum annually, or more frequently.",
                "Relationship": "Subset",
                "Control": 5.2,
                "ControlTitle": "Information security roles and responsibilities",
                "ControlText": "Information security roles and responsibilities should be defined and allocated according to the organization needs."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 6,
                "SARASafeguard": 6.8,
                "AssetType": "Data",
                "SecurityFunction": "Protect",
                "Title": "Define and Maintain Role-Based Access Control",
                "Description": "Define and maintain role-based access control, through determining and documenting the access rights necessary for each role within the enterprise to successfully carry out its assigned duties. Perform access control reviews of enterprise assets to validate that all privileges are authorized, on a recurring schedule at a minimum annually, or more frequently.",
                "Relationship": "Superset",
                "Control": 5.3,
                "ControlTitle": "Segregation of duties",
                "ControlText": "Conflicting duties and areas of responsibility should be segregated."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 6,
                "SARASafeguard": 6.8,
                "AssetType": "Data",
                "SecurityFunction": "Protect",
                "Title": "Define and Maintain Role-Based Access Control",
                "Description": "Define and maintain role-based access control, through determining and documenting the access rights necessary for each role within the enterprise to successfully carry out its assigned duties. Perform access control reviews of enterprise assets to validate that all privileges are authorized, on a recurring schedule at a minimum annually, or more frequently.",
                "Relationship": "Subset",
                "Control": 5.15,
                "ControlTitle": "Access control",
                "ControlText": "Rules to control physical and logical access to information and other associated assets should be established and implemented based on business and information security requirements."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 6,
                "SARASafeguard": 6.8,
                "AssetType": "Data",
                "SecurityFunction": "Protect",
                "Title": "Define and Maintain Role-Based Access Control",
                "Description": "Define and maintain role-based access control, through determining and documenting the access rights necessary for each role within the enterprise to successfully carry out its assigned duties. Perform access control reviews of enterprise assets to validate that all privileges are authorized, on a recurring schedule at a minimum annually, or more frequently.",
                "Relationship": "Subset",
                "Control": 8.2,
                "ControlTitle": "Privileged access rights",
                "ControlText": "The allocation and use of privileged access rights should be restricted and managed."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 6,
                "SARASafeguard": 6.8,
                "AssetType": "Data",
                "SecurityFunction": "Protect",
                "Title": "Define and Maintain Role-Based Access Control",
                "Description": "Define and maintain role-based access control, through determining and documenting the access rights necessary for each role within the enterprise to successfully carry out its assigned duties. Perform access control reviews of enterprise assets to validate that all privileges are authorized, on a recurring schedule at a minimum annually, or more frequently.",
                "Relationship": "Subset",
                "Control": 8.3,
                "ControlTitle": "Information access restriction",
                "ControlText": "Access to information and other associated assets should be restricted in accordance with the established topic-specific policy on access control."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 7,
                "SARASafeguard": 7.1,
                "AssetType": "Applications",
                "SecurityFunction": "Protect",
                "Title": "Establish and Maintain a Vulnerability Management Process",
                "Description": "Establish and maintain a documented vulnerability management process for enterprise assets. Review and update documentation annually, or when significant enterprise changes occur that could impact this Safeguard.",
                "Relationship": "Subset",
                "Control": 8.8,
                "ControlTitle": "Management of technical vulnerabilities",
                "ControlText": "Information about technical vulnerabilities of information systems in use should be obtained, the organization’s exposure to such vulnerabilities should be evaluated and appropriate measures should be taken."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 7,
                "SARASafeguard": 7.2,
                "AssetType": "Applications",
                "SecurityFunction": "Respond",
                "Title": "Establish and Maintain a Remediation Process",
                "Description": "Establish and maintain a risk-based remediation strategy documented in a remediation process, with monthly, or more frequent, reviews.",
                "Relationship": "Subset",
                "Control": 8.8,
                "ControlTitle": "Management of technical vulnerabilities",
                "ControlText": "Information about technical vulnerabilities of information systems in use should be obtained, the organization’s exposure to such vulnerabilities should be evaluated and appropriate measures should be taken."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 7,
                "SARASafeguard": 7.3,
                "AssetType": "Applications",
                "SecurityFunction": "Protect",
                "Title": "Perform Automated Operating System Patch Management",
                "Description": "Perform operating system updates on enterprise assets through automated patch management on a monthly, or more frequent, basis.",
                "Relationship": "Subset",
                "Control": 8.8,
                "ControlTitle": "Management of technical vulnerabilities",
                "ControlText": "Information about technical vulnerabilities of information systems in use should be obtained, the organization’s exposure to such vulnerabilities should be evaluated and appropriate measures should be taken."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 7,
                "SARASafeguard": 7.4,
                "AssetType": "Applications",
                "SecurityFunction": "Protect",
                "Title": "Perform Automated Application Patch Management",
                "Description": "Perform application updates on enterprise assets through automated patch management on a monthly, or more frequent, basis.",
                "Relationship": "Subset",
                "Control": 8.8,
                "ControlTitle": "Management of technical vulnerabilities",
                "ControlText": "Information about technical vulnerabilities of information systems in use should be obtained, the organization’s exposure to such vulnerabilities should be evaluated and appropriate measures should be taken."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 7,
                "SARASafeguard": 7.5,
                "AssetType": "Applications",
                "SecurityFunction": "Identify",
                "Title": "Perform Automated Vulnerability Scans of Internal Enterprise Assets",
                "Description": "Perform automated vulnerability scans of internal enterprise assets on a quarterly, or more frequent, basis. Conduct both authenticated and unauthenticated scans, using a SCAP-compliant vulnerability scanning tool.",
                "Relationship": "Subset",
                "Control": 8.8,
                "ControlTitle": "Management of technical vulnerabilities",
                "ControlText": "Information about technical vulnerabilities of information systems in use should be obtained, the organization’s exposure to such vulnerabilities should be evaluated and appropriate measures should be taken."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 7,
                "SARASafeguard": 7.6,
                "AssetType": "Applications",
                "SecurityFunction": "Identify",
                "Title": "Perform Automated Vulnerability Scans of Externally-Exposed Enterprise Assets",
                "Description": "Perform automated vulnerability scans of externally-exposed enterprise assets using a SCAP-compliant vulnerability scanning tool. Perform scans on a monthly, or more frequent, basis.",
                "Relationship": "Subset",
                "Control": 8.8,
                "ControlTitle": "Management of technical vulnerabilities",
                "ControlText": "Information about technical vulnerabilities of information systems in use should be obtained, the organization’s exposure to such vulnerabilities should be evaluated and appropriate measures should be taken."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 7,
                "SARASafeguard": 7.7,
                "AssetType": "Applications",
                "SecurityFunction": "Respond",
                "Title": "Remediate Detected Vulnerabilities",
                "Description": "Remediate detected vulnerabilities in software through processes and tooling on a monthly, or more frequent, basis, based on the remediation process.",
                "Relationship": "Subset",
                "Control": 8.8,
                "ControlTitle": "Management of technical vulnerabilities",
                "ControlText": "Information about technical vulnerabilities of information systems in use should be obtained, the organization’s exposure to such vulnerabilities should be evaluated and appropriate measures should be taken."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 8,
                "SARASafeguard": 8.1,
                "AssetType": "Network",
                "SecurityFunction": "Protect",
                "Title": "Establish and Maintain an Audit Log Management Process",
                "Description": "Establish and maintain an audit log management process that defines the enterprise’s logging requirements. At a minimum, address the collection, review, and retention of audit logs for enterprise assets. Review and update documentation annually, or when significant enterprise changes occur that could impact this Safeguard.",
                "Relationship": "Equivalent",
                "Control": 8.15,
                "ControlTitle": "Logging",
                "ControlText": "Logs that record activities, exceptions, faults and other relevant events should be produced, stored, protected and analysed."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 8,
                "SARASafeguard": 8.11,
                "AssetType": "Network",
                "SecurityFunction": "Detect",
                "Title": "Conduct Audit Log Reviews",
                "Description": "Conduct reviews of audit logs to detect anomalies or abnormal events that could indicate a potential threat. Conduct reviews on a weekly, or more frequent, basis.",
                "Relationship": "Subset",
                "Control": 5.25,
                "ControlTitle": "Assessment and decision on information security events",
                "ControlText": "The organization should assess information security events and decide if they are to be categorized as information security incidents."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 8,
                "SARASafeguard": 8.12,
                "AssetType": "Data",
                "SecurityFunction": "Detect",
                "Title": "Collect Service Provider Logs",
                "Description": "Collect service provider logs, where supported. Example implementations include collecting authentication and authorization events, data creation and disposal events, and user management events.",
                "Relationship": "Subset",
                "Control": 5.26,
                "ControlTitle": "Response to information security incidents",
                "ControlText": "Information security incidents should be responded to in accordance with the documented procedures."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 8,
                "SARASafeguard": 8.12,
                "AssetType": "Data",
                "SecurityFunction": "Detect",
                "Title": "Collect Service Provider Logs",
                "Description": "Collect service provider logs, where supported. Example implementations include collecting authentication and authorization events, data creation and disposal events, and user management events.",
                "Relationship": "Subset",
                "Control": 5.22,
                "ControlTitle": "Monitoring, review and change management of supplier services",
                "ControlText": "The organization should regularly monitor, review, evaluate and manage change in supplier information security practices and service delivery."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 8,
                "SARASafeguard": 8.2,
                "AssetType": "Network",
                "SecurityFunction": "Detect",
                "Title": "Collect Audit Logs",
                "Description": "Collect audit logs. Ensure that logging, per the enterprise’s audit log management process, has been enabled across enterprise assets.",
                "Relationship": "Subset",
                "Control": 5.15,
                "ControlTitle": "Access control",
                "ControlText": "Rules to control physical and logical access to information and other associated assets should be established and implemented based on business and information security requirements."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 8,
                "SARASafeguard": 8.2,
                "AssetType": "Network",
                "SecurityFunction": "Detect",
                "Title": "Collect Audit Logs",
                "Description": "Collect audit logs. Ensure that logging, per the enterprise’s audit log management process, has been enabled across enterprise assets.",
                "Relationship": "Subset",
                "Control": 8.15,
                "ControlTitle": "Logging",
                "ControlText": "Logs that record activities, exceptions, faults and other relevant events should be produced, stored, protected and analysed."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 8,
                "SARASafeguard": 8.2,
                "AssetType": "Network",
                "SecurityFunction": "Detect",
                "Title": "Collect Audit Logs",
                "Description": "Collect audit logs. Ensure that logging, per the enterprise’s audit log management process, has been enabled across enterprise assets.",
                "Relationship": "Subset",
                "Control": 8.2,
                "ControlTitle": "Networks security",
                "ControlText": "Networks and network devices should be secured, managed and controlled to protect information in systems and applications."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 8,
                "SARASafeguard": 8.3,
                "AssetType": "Network",
                "SecurityFunction": "Protect",
                "Title": "Ensure Adequate Audit Log Storage",
                "Description": "Ensure that logging destinations maintain adequate storage to comply with the enterprise’s audit log management process.",
                "Relationship": "Subset",
                "Control": 8.6,
                "ControlTitle": "Capacity management",
                "ControlText": "The use of resources should be monitored and adjusted in line with current and expected capacity requirements."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 8,
                "SARASafeguard": 8.4,
                "AssetType": "Network",
                "SecurityFunction": "Protect",
                "Title": "Standardize Time Synchronization",
                "Description": "Standardize time synchronization. Configure at least two synchronized time sources across enterprise assets, where supported.",
                "Relationship": "Subset",
                "Control": 8.15,
                "ControlTitle": "Logging",
                "ControlText": "Logs that record activities, exceptions, faults and other relevant events should be produced, stored, protected and analysed."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 8,
                "SARASafeguard": 8.4,
                "AssetType": "Network",
                "SecurityFunction": "Protect",
                "Title": "Standardize Time Synchronization",
                "Description": "Standardize time synchronization. Configure at least two synchronized time sources across enterprise assets, where supported.",
                "Relationship": "Equivalent",
                "Control": 8.17,
                "ControlTitle": "Clock synchronization",
                "ControlText": "The clocks of information processing systems used by the organization should be synchronized to approved time sources."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 8,
                "SARASafeguard": 8.5,
                "AssetType": "Network",
                "SecurityFunction": "Detect",
                "Title": "Collect Detailed Audit Logs",
                "Description": "Configure detailed audit logging for enterprise assets containing sensitive data. Include event source, date, username, timestamp, source addresses, destination addresses, and other useful elements that could assist in a forensic investigation.",
                "Relationship": "Subset",
                "Control": 5.26,
                "ControlTitle": "Response to information security incidents",
                "ControlText": "Information security incidents should be responded to in accordance with the documented procedures."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 8,
                "SARASafeguard": 8.5,
                "AssetType": "Network",
                "SecurityFunction": "Detect",
                "Title": "Collect Detailed Audit Logs",
                "Description": "Configure detailed audit logging for enterprise assets containing sensitive data. Include event source, date, username, timestamp, source addresses, destination addresses, and other useful elements that could assist in a forensic investigation.",
                "Relationship": "Subset",
                "Control": 5.28,
                "ControlTitle": "Collection of evidence",
                "ControlText": "The organization should establish and implement procedures for the identification, collection, acquisition and preservation of evidence related to information security events."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 8,
                "SARASafeguard": 8.5,
                "AssetType": "Network",
                "SecurityFunction": "Detect",
                "Title": "Collect Detailed Audit Logs",
                "Description": "Configure detailed audit logging for enterprise assets containing sensitive data. Include event source, date, username, timestamp, source addresses, destination addresses, and other useful elements that could assist in a forensic investigation.",
                "Relationship": "Subset",
                "Control": 8.15,
                "ControlTitle": "Logging",
                "ControlText": "Logs that record activities, exceptions, faults and other relevant events should be produced, stored, protected and analysed."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 8,
                "SARASafeguard": 8.6,
                "AssetType": "Network",
                "SecurityFunction": "Detect",
                "Title": "Collect DNS Query Audit Logs",
                "Description": "Collect DNS query audit logs on enterprise assets, where appropriate and supported.",
                "Relationship": "Subset",
                "Control": 8.18,
                "ControlTitle": "Use of privileged utility programs",
                "ControlText": "The use of utility programs that can be capable of overriding system and application controls should be restricted and tightly controlled."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 8,
                "SARASafeguard": 8.7,
                "AssetType": "Network",
                "SecurityFunction": "Detect",
                "Title": "Collect URL Request Audit Logs",
                "Description": "Collect URL request audit logs on enterprise assets, where appropriate and supported.",
                "Relationship": "Subset",
                "Control": 8.18,
                "ControlTitle": "Use of privileged utility programs",
                "ControlText": "The use of utility programs that can be capable of overriding system and application controls should be restricted and tightly controlled."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 8,
                "SARASafeguard": 8.8,
                "AssetType": "Devices",
                "SecurityFunction": "Detect",
                "Title": "Collect Command-Line Audit Logs",
                "Description": "Collect command-line audit logs. Example implementations include collecting audit logs from PowerShell®, BASH™, and remote administrative terminals.",
                "Relationship": "Subset",
                "Control": 8.15,
                "ControlTitle": "Logging",
                "ControlText": "Logs that record activities, exceptions, faults and other relevant events should be produced, stored, protected and analysed."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 8,
                "SARASafeguard": 8.8,
                "AssetType": "Devices",
                "SecurityFunction": "Detect",
                "Title": "Collect Command-Line Audit Logs",
                "Description": "Collect command-line audit logs. Example implementations include collecting audit logs from PowerShell®, BASH™, and remote administrative terminals.",
                "Relationship": "Subset",
                "Control": 8.18,
                "ControlTitle": "Use of privileged utility programs",
                "ControlText": "The use of utility programs that can be capable of overriding system and application controls should be restricted and tightly controlled."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 8,
                "SARASafeguard": 8.9,
                "AssetType": "Network",
                "SecurityFunction": "Detect",
                "Title": "Centralize Audit Logs",
                "Description": "Centralize, to the extent possible, audit log collection and retention across enterprise assets.",
                "Relationship": "",
                "Control": "",
                "ControlTitle": "",
                "ControlText": ""
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 9,
                "SARASafeguard": 9.1,
                "AssetType": "Applications",
                "SecurityFunction": "Protect",
                "Title": "Ensure Use of Only Fully Supported Browsers and Email Clients",
                "Description": "Ensure only fully supported browsers and email clients are allowed to execute in the enterprise, only using the latest version of browsers and email clients provided through the vendor.",
                "Relationship": "Subset",
                "Control": 8.1,
                "ControlTitle": "User endpoint devices",
                "ControlText": "Information stored on, processed by or accessible via user endpoint devices should be protected."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 9,
                "SARASafeguard": 9.2,
                "AssetType": "Network",
                "SecurityFunction": "Protect",
                "Title": "Use DNS Filtering Services",
                "Description": "Use DNS filtering services on all enterprise assets to block access to known malicious domains.",
                "Relationship": "Subset",
                "Control": 8.23,
                "ControlTitle": "Web filtering",
                "ControlText": "Access to external websites should be managed to reduce exposure to malicious content."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 9,
                "SARASafeguard": 9.3,
                "AssetType": "Network",
                "SecurityFunction": "Protect",
                "Title": "Maintain and Enforce Network-Based URL Filters",
                "Description": "Enforce and update network-based URL filters to limit an enterprise asset from connecting to potentially malicious or unapproved websites. Example implementations include category-based filtering, reputation-based filtering, or through the use of block lists. Enforce filters for all enterprise assets.",
                "Relationship": "Subset",
                "Control": 8.7,
                "ControlTitle": "Protection against malware",
                "ControlText": "Protection against malware should be implemented and supported by appropriate user awareness."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 9,
                "SARASafeguard": 9.3,
                "AssetType": "Network",
                "SecurityFunction": "Protect",
                "Title": "Maintain and Enforce Network-Based URL Filters",
                "Description": "Enforce and update network-based URL filters to limit an enterprise asset from connecting to potentially malicious or unapproved websites. Example implementations include category-based filtering, reputation-based filtering, or through the use of block lists. Enforce filters for all enterprise assets.",
                "Relationship": "Subset",
                "Control": 8.23,
                "ControlTitle": "Web filtering",
                "ControlText": "Access to external websites should be managed to reduce exposure to malicious content."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 9,
                "SARASafeguard": 9.4,
                "AssetType": "Applications",
                "SecurityFunction": "Protect",
                "Title": "Restrict Unnecessary or Unauthorized Browser and Email Client Extensions",
                "Description": "Restrict, either through uninstalling or disabling, any unauthorized or unnecessary browser or email client plugins, extensions, and add-on applications.",
                "Relationship": "",
                "Control": "",
                "ControlTitle": "",
                "ControlText": ""
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 9,
                "SARASafeguard": 9.5,
                "AssetType": "Network",
                "SecurityFunction": "Protect",
                "Title": "Implement DMARC",
                "Description": "To lower the chance of spoofed or modified emails from valid domains, implement DMARC policy and verification, starting with implementing the Sender Policy Framework (SPF) and the DomainKeys Identified Mail (DKIM) standards.",
                "Relationship": "",
                "Control": "",
                "ControlTitle": "",
                "ControlText": ""
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 9,
                "SARASafeguard": 9.6,
                "AssetType": "Network",
                "SecurityFunction": "Protect",
                "Title": "Block Unnecessary File Types",
                "Description": "Block unnecessary file types attempting to enter the enterprise’s email gateway.",
                "Relationship": "",
                "Control": "",
                "ControlTitle": "",
                "ControlText": ""
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 9,
                "SARASafeguard": 9.7,
                "AssetType": "Network",
                "SecurityFunction": "Protect",
                "Title": "Deploy and Maintain Email Server Anti-Malware Protections",
                "Description": "Deploy and maintain email server anti-malware protections, such as attachment scanning and/or sandboxing.",
                "Relationship": "Subset",
                "Control": 5.14,
                "ControlTitle": "Information transfer",
                "ControlText": "Information transfer rules, procedures, or agreements should be in place for all types of transfer facilities within the organization and between the organization and other parties."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 9,
                "SARASafeguard": 9.7,
                "AssetType": "Network",
                "SecurityFunction": "Protect",
                "Title": "Deploy and Maintain Email Server Anti-Malware Protections",
                "Description": "Deploy and maintain email server anti-malware protections, such as attachment scanning and/or sandboxing.",
                "Relationship": "Subset",
                "Control": 8.7,
                "ControlTitle": "Protection against malware",
                "ControlText": "Protection against malware should be implemented and supported by appropriate user awareness."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 10,
                "SARASafeguard": 10.1,
                "AssetType": "Devices",
                "SecurityFunction": "Protect",
                "Title": "Deploy and Maintain Anti-Malware Software",
                "Description": "Deploy and maintain anti-malware software on all enterprise assets.",
                "Relationship": "Subset",
                "Control": 8.1,
                "ControlTitle": "User endpoint devices",
                "ControlText": "Information stored on, processed by or accessible via user endpoint devices should be protected."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 10,
                "SARASafeguard": 10.1,
                "AssetType": "Devices",
                "SecurityFunction": "Protect",
                "Title": "Deploy and Maintain Anti-Malware Software",
                "Description": "Deploy and maintain anti-malware software on all enterprise assets.",
                "Relationship": "Subset",
                "Control": 8.7,
                "ControlTitle": "Protection against malware",
                "ControlText": "Protection against malware should be implemented and supported by appropriate user awareness."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 10,
                "SARASafeguard": 10.2,
                "AssetType": "Devices",
                "SecurityFunction": "Protect",
                "Title": "Configure Automatic Anti-Malware Signature Updates",
                "Description": "Configure automatic updates for anti-malware signature files on all enterprise assets.",
                "Relationship": "Subset",
                "Control": 8.7,
                "ControlTitle": "Protection against malware",
                "ControlText": "Protection against malware should be implemented and supported by appropriate user awareness."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 10,
                "SARASafeguard": 10.3,
                "AssetType": "Devices",
                "SecurityFunction": "Protect",
                "Title": "Disable Autorun and Autoplay for Removable Media",
                "Description": "Disable autorun and autoplay auto-execute functionality for removable media.",
                "Relationship": "Subset",
                "Control": 7.1,
                "ControlTitle": "Storage media",
                "ControlText": "Storage media should be managed through its life cycle of acquisition, use, transportation and disposal in accordance with the organization’s classification scheme and handling requirements."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 10,
                "SARASafeguard": 10.4,
                "AssetType": "Devices",
                "SecurityFunction": "Detect",
                "Title": "Configure Automatic Anti-Malware Scanning of Removable Media",
                "Description": "Configure anti-malware software to automatically scan removable media.",
                "Relationship": "Subset",
                "Control": 7.1,
                "ControlTitle": "Storage media",
                "ControlText": "Storage media should be managed through its life cycle of acquisition, use, transportation and disposal in accordance with the organization’s classification scheme and handling requirements."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 10,
                "SARASafeguard": 10.4,
                "AssetType": "Devices",
                "SecurityFunction": "Detect",
                "Title": "Configure Automatic Anti-Malware Scanning of Removable Media",
                "Description": "Configure anti-malware software to automatically scan removable media.",
                "Relationship": "Subset",
                "Control": 8.7,
                "ControlTitle": "Protection against malware",
                "ControlText": "Protection against malware should be implemented and supported by appropriate user awareness."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 10,
                "SARASafeguard": 10.5,
                "AssetType": "Devices",
                "SecurityFunction": "Protect",
                "Title": "Enable Anti-Exploitation Features",
                "Description": "Enable anti-exploitation features on enterprise assets and software, where possible, such as Microsoft® Data Execution Prevention (DEP), Windows® Defender Exploit Guard (WDEG), or Apple® System Integrity Protection (SIP) and Gatekeeper™.",
                "Relationship": "",
                "Control": "",
                "ControlTitle": "",
                "ControlText": ""
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 10,
                "SARASafeguard": 10.6,
                "AssetType": "Devices",
                "SecurityFunction": "Protect",
                "Title": "Centrally Manage Anti-Malware Software",
                "Description": "Centrally manage anti-malware software.",
                "Relationship": "",
                "Control": "",
                "ControlTitle": "",
                "ControlText": ""
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 10,
                "SARASafeguard": 10.7,
                "AssetType": "Devices",
                "SecurityFunction": "Detect",
                "Title": "Use Behavior-Based Anti-Malware Software",
                "Description": "Use behavior-based anti-malware software.",
                "Relationship": "Subset",
                "Control": 8.1,
                "ControlTitle": "User endpoint devices",
                "ControlText": "Information stored on, processed by or accessible via user endpoint devices should be protected."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 11,
                "SARASafeguard": 11.1,
                "AssetType": "Data",
                "SecurityFunction": "Recover",
                "Title": "Establish and Maintain a Data Recovery Process",
                "Description": "Establish and maintain a data recovery process. In the process, address the scope of data recovery activities, recovery prioritization, and the security of backup data. Review and update documentation annually, or when significant enterprise changes occur that could impact this Safeguard.",
                "Relationship": "Subset",
                "Control": 8.7,
                "ControlTitle": "Protection against malware",
                "ControlText": "Protection against malware should be implemented and supported by appropriate user awareness."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 11,
                "SARASafeguard": 11.1,
                "AssetType": "Data",
                "SecurityFunction": "Recover",
                "Title": "Establish and Maintain a Data Recovery Process",
                "Description": "Establish and maintain a data recovery process. In the process, address the scope of data recovery activities, recovery prioritization, and the security of backup data. Review and update documentation annually, or when significant enterprise changes occur that could impact this Safeguard.",
                "Relationship": "Subset",
                "Control": 8.13,
                "ControlTitle": "Information backup",
                "ControlText": "Backup copies of information, software and systems should be maintained and regularly tested in accordance with the agreed topic-specific policy on backup."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 11,
                "SARASafeguard": 11.2,
                "AssetType": "Data",
                "SecurityFunction": "Recover",
                "Title": "Perform Automated Backups",
                "Description": "Perform automated backups of in-scope enterprise assets. Run backups weekly, or more frequently, based on the sensitivity of the data.",
                "Relationship": "",
                "Control": "",
                "ControlTitle": "",
                "ControlText": ""
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 11,
                "SARASafeguard": 11.3,
                "AssetType": "Data",
                "SecurityFunction": "Protect",
                "Title": "Protect Recovery Data",
                "Description": "Protect recovery data with equivalent controls to the original data. Reference encryption or data separation, based on requirements.",
                "Relationship": "Subset",
                "Control": 8.12,
                "ControlTitle": "Data leakage prevention",
                "ControlText": "Data leakage prevention measures should be applied to systems, networks and any other devices that process, store or transmit sensitive information."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 11,
                "SARASafeguard": 11.4,
                "AssetType": "Data",
                "SecurityFunction": "Recover",
                "Title": "Establish and Maintain an Isolated Instance of Recovery Data",
                "Description": "Establish and maintain an isolated instance of recovery data. Example implementations include, version controlling backup destinations through offline, cloud, or off-site systems or services.",
                "Relationship": "Subset",
                "Control": 8.13,
                "ControlTitle": "Information backup",
                "ControlText": "Backup copies of information, software and systems should be maintained and regularly tested in accordance with the agreed topic-specific policy on backup."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 11,
                "SARASafeguard": 11.5,
                "AssetType": "Data",
                "SecurityFunction": "Recover",
                "Title": "Test Data Recovery",
                "Description": "Test backup recovery quarterly, or more frequently, for a sampling of in-scope enterprise assets.",
                "Relationship": "Subset",
                "Control": 8.13,
                "ControlTitle": "Information backup",
                "ControlText": "Backup copies of information, software and systems should be maintained and regularly tested in accordance with the agreed topic-specific policy on backup."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 12,
                "SARASafeguard": 12.1,
                "AssetType": "Network",
                "SecurityFunction": "Protect",
                "Title": "Ensure Network Infrastructure is Up-to-Date",
                "Description": "Ensure network infrastructure is kept up-to-date. Example implementations include running the latest stable release of software and/or using currently supported network-as-a-service (NaaS) offerings. Review software versions monthly, or more frequently, to verify software support.",
                "Relationship": "",
                "Control": "",
                "ControlTitle": "",
                "ControlText": ""
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 12,
                "SARASafeguard": 12.2,
                "AssetType": "Network",
                "SecurityFunction": "Protect",
                "Title": "Establish and Maintain a Secure Network Architecture",
                "Description": "Establish and maintain a secure network architecture. A secure network architecture must address segmentation, least privilege, and availability, at a minimum.",
                "Relationship": "Subset",
                "Control": 8.22,
                "ControlTitle": "Segregation of networks",
                "ControlText": "Groups of information services, users and information systems should be segregated in the organization’s networks."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 12,
                "SARASafeguard": 12.2,
                "AssetType": "Network",
                "SecurityFunction": "Protect",
                "Title": "Establish and Maintain a Secure Network Architecture",
                "Description": "Establish and maintain a secure network architecture. A secure network architecture must address segmentation, least privilege, and availability, at a minimum.",
                "Relationship": "Subset",
                "Control": 8.27,
                "ControlTitle": "Secure system architecture and engineering principles",
                "ControlText": "Principles for engineering secure systems to be established, documented, maintained and applied to any information system development activities."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 12,
                "SARASafeguard": 12.3,
                "AssetType": "Network",
                "SecurityFunction": "Protect",
                "Title": "Securely Manage Network Infrastructure",
                "Description": "Securely manage network infrastructure. Example implementations include version-controlled-infrastructure-as-code, and the use of secure network protocols, such as SSH and HTTPS.",
                "Relationship": "Subset",
                "Control": 8.21,
                "ControlTitle": "Security of network services",
                "ControlText": "Security mechanisms, service levels and service requirements of network services should be identified, implemented and monitored."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 12,
                "SARASafeguard": 12.4,
                "AssetType": "Network",
                "SecurityFunction": "Identify",
                "Title": "Establish and Maintain Architecture Diagram(s)",
                "Description": "Establish and maintain architecture diagram(s) and/or other network system documentation. Review and update documentation annually, or when significant enterprise changes occur that could impact this Safeguard.",
                "Relationship": "",
                "Control": "",
                "ControlTitle": "",
                "ControlText": ""
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 12,
                "SARASafeguard": 12.5,
                "AssetType": "Network",
                "SecurityFunction": "Protect",
                "Title": "Centralize Network Authentication, Authorization, and Auditing (AAA)",
                "Description": "Centralize network AAA.",
                "Relationship": "",
                "Control": "",
                "ControlTitle": "",
                "ControlText": ""
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 12,
                "SARASafeguard": 12.6,
                "AssetType": "Network",
                "SecurityFunction": "Protect",
                "Title": "Use of Secure Network Management and Communication Protocols",
                "Description": "Use secure network management and communication protocols (e.g., 802.1X, Wi-Fi Protected Access 2 (WPA2) Enterprise or greater).",
                "Relationship": "Subset",
                "Control": 8.21,
                "ControlTitle": "Security of network services",
                "ControlText": "Security mechanisms, service levels and service requirements of network services should be identified, implemented and monitored."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 12,
                "SARASafeguard": 12.7,
                "AssetType": "Devices",
                "SecurityFunction": "Protect",
                "Title": "Ensure Remote Devices Utilize a VPN and are Connecting to an Enterprise’s AAA Infrastructure",
                "Description": "Require users to authenticate to enterprise-managed VPN and authentication services prior to accessing enterprise resources on end-user devices.",
                "Relationship": "Subset",
                "Control": 6.7,
                "ControlTitle": "Remote working",
                "ControlText": "Security measures should be implemented when personnel are working remotely to protect information accessed, processed or stored outside the organization’s premises."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 12,
                "SARASafeguard": 12.7,
                "AssetType": "Devices",
                "SecurityFunction": "Protect",
                "Title": "Ensure Remote Devices Utilize a VPN and are Connecting to an Enterprise’s AAA Infrastructure",
                "Description": "Require users to authenticate to enterprise-managed VPN and authentication services prior to accessing enterprise resources on end-user devices.",
                "Relationship": "Subset",
                "Control": 8.1,
                "ControlTitle": "User endpoint devices",
                "ControlText": "Information stored on, processed by or accessible via user endpoint devices should be protected."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 12,
                "SARASafeguard": 12.7,
                "AssetType": "Devices",
                "SecurityFunction": "Protect",
                "Title": "Ensure Remote Devices Utilize a VPN and are Connecting to an Enterprise’s AAA Infrastructure",
                "Description": "Require users to authenticate to enterprise-managed VPN and authentication services prior to accessing enterprise resources on end-user devices.",
                "Relationship": "Subset",
                "Control": 8.21,
                "ControlTitle": "Security of network services",
                "ControlText": "Security mechanisms, service levels and service requirements of network services should be identified, implemented and monitored."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 12,
                "SARASafeguard": 12.8,
                "AssetType": "Devices",
                "SecurityFunction": "Protect",
                "Title": "Establish and Maintain Dedicated Computing Resources for All Administrative Work",
                "Description": "Establish and maintain dedicated computing resources, either physically or logically separated, for all administrative tasks or tasks requiring administrative access. The computing resources should be segmented from the enterprise's primary network and not be allowed internet access.",
                "Relationship": "Subset",
                "Control": 8.2,
                "ControlTitle": "Privileged access rights",
                "ControlText": "The allocation and use of privileged access rights should be restricted and managed."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 12,
                "SARASafeguard": 12.8,
                "AssetType": "Devices",
                "SecurityFunction": "Protect",
                "Title": "Establish and Maintain Dedicated Computing Resources for All Administrative Work",
                "Description": "Establish and maintain dedicated computing resources, either physically or logically separated, for all administrative tasks or tasks requiring administrative access. The computing resources should be segmented from the enterprise's primary network and not be allowed internet access.",
                "Relationship": "Subset",
                "Control": 8.22,
                "ControlTitle": "Segregation of networks",
                "ControlText": "Groups of information services, users and information systems should be segregated in the organization’s networks."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 13,
                "SARASafeguard": 13.1,
                "AssetType": "Network",
                "SecurityFunction": "Detect",
                "Title": "Centralize Security Event Alerting",
                "Description": "Centralize security event alerting across enterprise assets for log correlation and analysis. Best practice implementation requires the use of a SIEM, which includes vendor-defined event correlation alerts. A log analytics platform configured with security-relevant correlation alerts also satisfies this Safeguard.",
                "Relationship": "Subset",
                "Control": 8.15,
                "ControlTitle": "Logging",
                "ControlText": "Logs that record activities, exceptions, faults and other relevant events should be produced, stored, protected and analysed."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 13,
                "SARASafeguard": 13.11,
                "AssetType": "Network",
                "SecurityFunction": "Detect",
                "Title": "Tune Security Event Alerting Thresholds",
                "Description": "Tune security event alerting thresholds monthly, or more frequently.",
                "Relationship": "Subset",
                "Control": 5.25,
                "ControlTitle": "Assessment and decision on information security events",
                "ControlText": "The organization should assess information security events and decide if they are to be categorized as information security incidents."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 13,
                "SARASafeguard": 13.2,
                "AssetType": "Devices",
                "SecurityFunction": "Detect",
                "Title": "Deploy a Host-Based Intrusion Detection Solution",
                "Description": "Deploy a host-based intrusion detection solution on enterprise assets, where appropriate and/or supported.",
                "Relationship": "Subset",
                "Control": 8.16,
                "ControlTitle": "Monitoring activities",
                "ControlText": "Networks, systems and applications should be monitored for anomalous behaviour and appropriate actions taken to evaluate potential information security incidents."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 13,
                "SARASafeguard": 13.3,
                "AssetType": "Network",
                "SecurityFunction": "Detect",
                "Title": "Deploy a Network Intrusion Detection Solution",
                "Description": "Deploy a network intrusion detection solution on enterprise assets, where appropriate. Example implementations include the use of a Network Intrusion Detection System (NIDS) or equivalent cloud service provider (CSP) service.",
                "Relationship": "Subset",
                "Control": 8.16,
                "ControlTitle": "Monitoring activities",
                "ControlText": "Networks, systems and applications should be monitored for anomalous behaviour and appropriate actions taken to evaluate potential information security incidents."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 13,
                "SARASafeguard": 13.3,
                "AssetType": "Network",
                "SecurityFunction": "Detect",
                "Title": "Deploy a Network Intrusion Detection Solution",
                "Description": "Deploy a network intrusion detection solution on enterprise assets, where appropriate. Example implementations include the use of a Network Intrusion Detection System (NIDS) or equivalent cloud service provider (CSP) service.",
                "Relationship": "Subset",
                "Control": 8.21,
                "ControlTitle": "Security of network services",
                "ControlText": "Security mechanisms, service levels and service requirements of network services should be identified, implemented and monitored."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 13,
                "SARASafeguard": 13.4,
                "AssetType": "Network",
                "SecurityFunction": "Protect",
                "Title": "Perform Traffic Filtering Between Network Segments",
                "Description": "Perform traffic filtering between network segments, where appropriate.",
                "Relationship": "Subset",
                "Control": 8.16,
                "ControlTitle": "Monitoring activities",
                "ControlText": "Networks, systems and applications should be monitored for anomalous behaviour and appropriate actions taken to evaluate potential information security incidents."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 13,
                "SARASafeguard": 13.4,
                "AssetType": "Network",
                "SecurityFunction": "Protect",
                "Title": "Perform Traffic Filtering Between Network Segments",
                "Description": "Perform traffic filtering between network segments, where appropriate.",
                "Relationship": "Subset",
                "Control": 8.22,
                "ControlTitle": "Segregation of networks",
                "ControlText": "Groups of information services, users and information systems should be segregated in the organization’s networks."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 13,
                "SARASafeguard": 13.5,
                "AssetType": "Devices",
                "SecurityFunction": "Protect",
                "Title": "Manage Access Control for Remote Assets",
                "Description": "Manage access control for assets remotely connecting to enterprise resources. Determine amount of access to enterprise resources based on: up-to-date anti-malware software installed, configuration compliance with the enterprise’s secure configuration process, and ensuring the operating system and applications are up-to-date.",
                "Relationship": "Subset",
                "Control": 6.7,
                "ControlTitle": "Remote working",
                "ControlText": "Security measures should be implemented when personnel are working remotely to protect information accessed, processed or stored outside the organization’s premises."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 13,
                "SARASafeguard": 13.5,
                "AssetType": "Devices",
                "SecurityFunction": "Protect",
                "Title": "Manage Access Control for Remote Assets",
                "Description": "Manage access control for assets remotely connecting to enterprise resources. Determine amount of access to enterprise resources based on: up-to-date anti-malware software installed, configuration compliance with the enterprise’s secure configuration process, and ensuring the operating system and applications are up-to-date.",
                "Relationship": "Subset",
                "Control": 8.1,
                "ControlTitle": "User endpoint devices",
                "ControlText": "Information stored on, processed by or accessible via user endpoint devices should be protected."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 13,
                "SARASafeguard": 13.5,
                "AssetType": "Devices",
                "SecurityFunction": "Protect",
                "Title": "Manage Access Control for Remote Assets",
                "Description": "Manage access control for assets remotely connecting to enterprise resources. Determine amount of access to enterprise resources based on: up-to-date anti-malware software installed, configuration compliance with the enterprise’s secure configuration process, and ensuring the operating system and applications are up-to-date.",
                "Relationship": "Subset",
                "Control": 8.3,
                "ControlTitle": "Information access restriction",
                "ControlText": "Access to information and other associated assets should be restricted in accordance with the established topic-specific policy on access control."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 13,
                "SARASafeguard": 13.6,
                "AssetType": "Network",
                "SecurityFunction": "Detect",
                "Title": "Collect Network Traffic Flow Logs",
                "Description": "Collect network traffic flow logs and/or network traffic to review and alert upon from network devices.",
                "Relationship": "Subset",
                "Control": 8.15,
                "ControlTitle": "Logging",
                "ControlText": "Logs that record activities, exceptions, faults and other relevant events should be produced, stored, protected and analysed."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 13,
                "SARASafeguard": 13.6,
                "AssetType": "Network",
                "SecurityFunction": "Detect",
                "Title": "Collect Network Traffic Flow Logs",
                "Description": "Collect network traffic flow logs and/or network traffic to review and alert upon from network devices.",
                "Relationship": "Subset",
                "Control": 8.16,
                "ControlTitle": "Monitoring activities",
                "ControlText": "Networks, systems and applications should be monitored for anomalous behaviour and appropriate actions taken to evaluate potential information security incidents."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 13,
                "SARASafeguard": 13.7,
                "AssetType": "Devices",
                "SecurityFunction": "Protect",
                "Title": "Deploy a Host-Based Intrusion Prevention Solution",
                "Description": "Deploy a host-based intrusion prevention solution on enterprise assets, where appropriate and/or supported. Example implementations include use of an Endpoint Detection and Response (EDR) client or host-based IPS agent.",
                "Relationship": "",
                "Control": "",
                "ControlTitle": "",
                "ControlText": ""
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 13,
                "SARASafeguard": 13.8,
                "AssetType": "Network",
                "SecurityFunction": "Protect",
                "Title": "Deploy a Network Intrusion Prevention Solution",
                "Description": "Deploy a network intrusion prevention solution, where appropriate. Example implementations include the use of a Network Intrusion Prevention System (NIPS) or equivalent CSP service.",
                "Relationship": "",
                "Control": "",
                "ControlTitle": "",
                "ControlText": ""
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 13,
                "SARASafeguard": 13.9,
                "AssetType": "Devices",
                "SecurityFunction": "Protect",
                "Title": "Deploy Port-Level Access Control",
                "Description": "Deploy port-level access control. Port-level access control utilizes 802.1x, or similar network access control protocols, such as certificates, and may incorporate user and/or device authentication.",
                "Relationship": "",
                "Control": "",
                "ControlTitle": "",
                "ControlText": ""
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 14,
                "SARASafeguard": 14.1,
                "AssetType": "N/A",
                "SecurityFunction": "Protect",
                "Title": "Establish and Maintain a Security Awareness Program",
                "Description": "Establish and maintain a security awareness program. The purpose of a security awareness program is to educate the enterprise’s workforce on how to interact with enterprise assets and data in a secure manner. Conduct training at hire and, at a minimum, annually. Review and update content annually, or when significant enterprise changes occur that could impact this Safeguard.",
                "Relationship": "Equivalent",
                "Control": 6.3,
                "ControlTitle": "Information security awareness, education and training",
                "ControlText": "Personnel of the organization and relevant interested parties should receive appropriate information security awareness, education and training and regular updates of the organization's information security policy, topic-specific policies and procedures, as relevant for their job function."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 14,
                "SARASafeguard": 14.2,
                "AssetType": "N/A",
                "SecurityFunction": "Protect",
                "Title": "Train Workforce Members to Recognize Social Engineering Attacks",
                "Description": "Train workforce members to recognize social engineering attacks, such as phishing, pre-texting, and tailgating.",
                "Relationship": "Subset",
                "Control": 8.7,
                "ControlTitle": "Protection against malware",
                "ControlText": "Protection against malware should be implemented and supported by appropriate user awareness."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 14,
                "SARASafeguard": 14.3,
                "AssetType": "N/A",
                "SecurityFunction": "Protect",
                "Title": "Train Workforce Members on Authentication Best Practices",
                "Description": "Train workforce members on authentication best practices. Example topics include MFA, password composition, and credential management.",
                "Relationship": "",
                "Control": "",
                "ControlTitle": "",
                "ControlText": ""
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 14,
                "SARASafeguard": 14.4,
                "AssetType": "N/A",
                "SecurityFunction": "Protect",
                "Title": "Train Workforce on Data Handling Best Practices",
                "Description": "Train workforce members on how to identify and properly store, transfer, archive, and destroy sensitive data. This also includes training workforce members on clear screen and desk best practices, such as locking their screen when they step away from their enterprise asset, erasing physical and virtual whiteboards at the end of meetings, and storing data and assets securely.",
                "Relationship": "Subset",
                "Control": 5.1,
                "ControlTitle": "Acceptable use of information and other associated assets",
                "ControlText": "Rules for the acceptable use and procedures for handling information and other associated assets should be identified, documented and implemented."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 14,
                "SARASafeguard": 14.5,
                "AssetType": "N/A",
                "SecurityFunction": "Protect",
                "Title": "Train Workforce Members on Causes of Unintentional Data Exposure",
                "Description": "Train workforce members to be aware of causes for unintentional data exposure. Example topics include mis-delivery of sensitive data, losing a portable end-user device, or publishing data to unintended audiences.",
                "Relationship": "Subset",
                "Control": 8.12,
                "ControlTitle": "Data leakage prevention",
                "ControlText": "Data leakage prevention measures should be applied to systems, networks and any other devices that process, store or transmit sensitive information."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 14,
                "SARASafeguard": 14.6,
                "AssetType": "N/A",
                "SecurityFunction": "Protect",
                "Title": "Train Workforce Members on Recognizing and Reporting Security Incidents",
                "Description": "Train workforce members to be able to recognize a potential incident and be able to report such an incident.",
                "Relationship": "Subset",
                "Control": 6.8,
                "ControlTitle": "Information security event reporting",
                "ControlText": "The organization should provide a mechanism for personnel to report observed or suspected information security events through appropriate channels in a timely manner."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 14,
                "SARASafeguard": 14.7,
                "AssetType": "N/A",
                "SecurityFunction": "Protect",
                "Title": "Train Workforce on How to Identify and Report if Their Enterprise Assets are Missing Security Updates",
                "Description": "Train workforce to understand how to verify and report out-of-date software patches or any failures in automated processes and tools. Part of this training should include notifying IT personnel of any failures in automated processes and tools.",
                "Relationship": "",
                "Control": "",
                "ControlTitle": "",
                "ControlText": ""
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 14,
                "SARASafeguard": 14.8,
                "AssetType": "N/A",
                "SecurityFunction": "Protect",
                "Title": "Train Workforce on the Dangers of Connecting to and Transmitting Enterprise Data Over Insecure Networks",
                "Description": "Train workforce members on the dangers of connecting to, and transmitting data over, insecure networks for enterprise activities. If the enterprise has remote workers, training must include guidance to ensure that all users securely configure their home network infrastructure.",
                "Relationship": "Subset",
                "Control": 5.14,
                "ControlTitle": "Information transfer",
                "ControlText": "Information transfer rules, procedures, or agreements should be in place for all types of transfer facilities within the organization and between the organization and other parties."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 14,
                "SARASafeguard": 14.8,
                "AssetType": "N/A",
                "SecurityFunction": "Protect",
                "Title": "Train Workforce on the Dangers of Connecting to and Transmitting Enterprise Data Over Insecure Networks",
                "Description": "Train workforce members on the dangers of connecting to, and transmitting data over, insecure networks for enterprise activities. If the enterprise has remote workers, training must include guidance to ensure that all users securely configure their home network infrastructure.",
                "Relationship": "Subset",
                "Control": 6.7,
                "ControlTitle": "Remote working",
                "ControlText": "Security measures should be implemented when personnel are working remotely to protect information accessed, processed or stored outside the organization’s premises."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 14,
                "SARASafeguard": 14.8,
                "AssetType": "N/A",
                "SecurityFunction": "Protect",
                "Title": "Train Workforce on the Dangers of Connecting to and Transmitting Enterprise Data Over Insecure Networks",
                "Description": "Train workforce members on the dangers of connecting to, and transmitting data over, insecure networks for enterprise activities. If the enterprise has remote workers, training must include guidance to ensure that all users securely configure their home network infrastructure.",
                "Relationship": "Subset",
                "Control": 8.1,
                "ControlTitle": "User endpoint devices",
                "ControlText": "Information stored on, processed by or accessible via user endpoint devices should be protected."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 14,
                "SARASafeguard": 14.9,
                "AssetType": "N/A",
                "SecurityFunction": "Protect",
                "Title": "Conduct Role-Specific Security Awareness and Skills Training",
                "Description": "Conduct role-specific security awareness and skills training. Example implementations include secure system administration courses for IT professionals, (OWASP® Top 10 vulnerability awareness and prevention training for web application developers, and advanced social engineering awareness training for high-profile roles.",
                "Relationship": "Subset",
                "Control": 5.2,
                "ControlTitle": "Information security roles and responsibilities",
                "ControlText": "Information security roles and responsibilities should be defined and allocated according to the organization needs."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 14,
                "SARASafeguard": 14.9,
                "AssetType": "N/A",
                "SecurityFunction": "Protect",
                "Title": "Conduct Role-Specific Security Awareness and Skills Training",
                "Description": "Conduct role-specific security awareness and skills training. Example implementations include secure system administration courses for IT professionals, (OWASP® Top 10 vulnerability awareness and prevention training for web application developers, and advanced social engineering awareness training for high-profile roles.",
                "Relationship": "Subset",
                "Control": 5.19,
                "ControlTitle": "Information security in supplier relationships",
                "ControlText": "Processes and procedures should be defined and implemented to manage the information security risks associated with the use of supplier’s products or services."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 14,
                "SARASafeguard": 14.9,
                "AssetType": "N/A",
                "SecurityFunction": "Protect",
                "Title": "Conduct Role-Specific Security Awareness and Skills Training",
                "Description": "Conduct role-specific security awareness and skills training. Example implementations include secure system administration courses for IT professionals, (OWASP® Top 10 vulnerability awareness and prevention training for web application developers, and advanced social engineering awareness training for high-profile roles.",
                "Relationship": "Subset",
                "Control": 6.3,
                "ControlTitle": "Information security awareness, education and training",
                "ControlText": "Personnel of the organization and relevant interested parties should receive appropriate information security awareness, education and training and regular updates of the organization's information security policy, topic-specific policies and procedures, as relevant for their job function."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 15,
                "SARASafeguard": 15.1,
                "AssetType": "N/A",
                "SecurityFunction": "Identify",
                "Title": "Establish and Maintain an Inventory of Service Providers",
                "Description": "Establish and maintain an inventory of service providers. The inventory is to list all known service providers, include classification(s), and designate an enterprise contact for each service provider. Review and update the inventory annually, or when significant enterprise changes occur that could impact this Safeguard.",
                "Relationship": "Subset",
                "Control": 5.19,
                "ControlTitle": "Information security in supplier relationships",
                "ControlText": "Processes and procedures should be defined and implemented to manage the information security risks associated with the use of supplier’s products or services."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 15,
                "SARASafeguard": 15.2,
                "AssetType": "N/A",
                "SecurityFunction": "Identify",
                "Title": "Establish and Maintain a Service Provider Management Policy",
                "Description": "Establish and maintain a service provider management policy. Ensure the policy addresses the classification, inventory, assessment, monitoring, and decommissioning of service providers. Review and update the policy annually, or when significant enterprise changes occur that could impact this Safeguard.",
                "Relationship": "Subset",
                "Control": 5.1,
                "ControlTitle": "Policies for information security",
                "ControlText": "Information security policy and topic-specific policies should be defined, approved by management, published, communicated to and acknowledged by relevant personnel and relevant interested parties, and reviewed at planned intervals and if significant changes occur."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 15,
                "SARASafeguard": 15.2,
                "AssetType": "N/A",
                "SecurityFunction": "Identify",
                "Title": "Establish and Maintain a Service Provider Management Policy",
                "Description": "Establish and maintain a service provider management policy. Ensure the policy addresses the classification, inventory, assessment, monitoring, and decommissioning of service providers. Review and update the policy annually, or when significant enterprise changes occur that could impact this Safeguard.",
                "Relationship": "Subset",
                "Control": 5.1,
                "ControlTitle": "Acceptable use of information and other associated assets",
                "ControlText": "Rules for the acceptable use and procedures for handling information and other associated assets should be identified, documented and implemented."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 15,
                "SARASafeguard": 15.2,
                "AssetType": "N/A",
                "SecurityFunction": "Identify",
                "Title": "Establish and Maintain a Service Provider Management Policy",
                "Description": "Establish and maintain a service provider management policy. Ensure the policy addresses the classification, inventory, assessment, monitoring, and decommissioning of service providers. Review and update the policy annually, or when significant enterprise changes occur that could impact this Safeguard.",
                "Relationship": "Subset",
                "Control": 5.19,
                "ControlTitle": "Information security in supplier relationships",
                "ControlText": "Processes and procedures should be defined and implemented to manage the information security risks associated with the use of supplier’s products or services."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 15,
                "SARASafeguard": 15.2,
                "AssetType": "N/A",
                "SecurityFunction": "Identify",
                "Title": "Establish and Maintain a Service Provider Management Policy",
                "Description": "Establish and maintain a service provider management policy. Ensure the policy addresses the classification, inventory, assessment, monitoring, and decommissioning of service providers. Review and update the policy annually, or when significant enterprise changes occur that could impact this Safeguard.",
                "Relationship": "Subset",
                "Control": 5.2,
                "ControlTitle": "Addressing information security within supplier agreements",
                "ControlText": "Relevant information security requirements should be established and agreed with each supplier based on the type of supplier relationship."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 15,
                "SARASafeguard": 15.2,
                "AssetType": "N/A",
                "SecurityFunction": "Identify",
                "Title": "Establish and Maintain a Service Provider Management Policy",
                "Description": "Establish and maintain a service provider management policy. Ensure the policy addresses the classification, inventory, assessment, monitoring, and decommissioning of service providers. Review and update the policy annually, or when significant enterprise changes occur that could impact this Safeguard.",
                "Relationship": "Subset",
                "Control": 5.23,
                "ControlTitle": "Information security for use of cloud services",
                "ControlText": "Processes for acquisition, use, management and exit from cloud services should be established in accordance with the organization’s information security requirements."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 15,
                "SARASafeguard": 15.3,
                "AssetType": "N/A",
                "SecurityFunction": "Identify",
                "Title": "Classify Service Providers",
                "Description": "Classify service providers. Classification consideration may include one or more characteristics, such as data sensitivity, data volume, availability requirements, applicable regulations, inherent risk, and mitigated risk. Update and review classifications annually, or when significant enterprise changes occur that could impact this Safeguard.",
                "Relationship": "Subset",
                "Control": 5.19,
                "ControlTitle": "Information security in supplier relationships",
                "ControlText": "Processes and procedures should be defined and implemented to manage the information security risks associated with the use of supplier’s products or services."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 15,
                "SARASafeguard": 15.4,
                "AssetType": "N/A",
                "SecurityFunction": "Protect",
                "Title": "Ensure Service Provider Contracts Include Security Requirements",
                "Description": "Ensure service provider contracts include security requirements. Example requirements may include minimum security program requirements, security incident and/or data breach notification and response, data encryption requirements, and data disposal commitments. These security requirements must be consistent with the enterprise’s service provider management policy. Review service provider contracts annually to ensure contracts are not missing security requirements.",
                "Relationship": "Subset",
                "Control": 5.2,
                "ControlTitle": "Addressing information security within supplier agreements",
                "ControlText": "Relevant information security requirements should be established and agreed with each supplier based on the type of supplier relationship."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 15,
                "SARASafeguard": 15.4,
                "AssetType": "N/A",
                "SecurityFunction": "Protect",
                "Title": "Ensure Service Provider Contracts Include Security Requirements",
                "Description": "Ensure service provider contracts include security requirements. Example requirements may include minimum security program requirements, security incident and/or data breach notification and response, data encryption requirements, and data disposal commitments. These security requirements must be consistent with the enterprise’s service provider management policy. Review service provider contracts annually to ensure contracts are not missing security requirements.",
                "Relationship": "Subset",
                "Control": 5.21,
                "ControlTitle": "Managing information security in the ICT supply chain",
                "ControlText": "Processes and procedures should be defined and implemented to manage information security risks associated with the ICT products and services supply chain."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 15,
                "SARASafeguard": 15.4,
                "AssetType": "N/A",
                "SecurityFunction": "Protect",
                "Title": "Ensure Service Provider Contracts Include Security Requirements",
                "Description": "Ensure service provider contracts include security requirements. Example requirements may include minimum security program requirements, security incident and/or data breach notification and response, data encryption requirements, and data disposal commitments. These security requirements must be consistent with the enterprise’s service provider management policy. Review service provider contracts annually to ensure contracts are not missing security requirements.",
                "Relationship": "Subset",
                "Control": 5.23,
                "ControlTitle": "Information security for use of cloud services",
                "ControlText": "Processes for acquisition, use, management and exit from cloud services should be established in accordance with the organization’s information security requirements."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 15,
                "SARASafeguard": 15.4,
                "AssetType": "N/A",
                "SecurityFunction": "Protect",
                "Title": "Ensure Service Provider Contracts Include Security Requirements",
                "Description": "Ensure service provider contracts include security requirements. Example requirements may include minimum security program requirements, security incident and/or data breach notification and response, data encryption requirements, and data disposal commitments. These security requirements must be consistent with the enterprise’s service provider management policy. Review service provider contracts annually to ensure contracts are not missing security requirements.",
                "Relationship": "Subset",
                "Control": 8.8,
                "ControlTitle": "Management of technical vulnerabilities",
                "ControlText": "Information about technical vulnerabilities of information systems in use should be obtained, the organization’s exposure to such vulnerabilities should be evaluated and appropriate measures should be taken."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 15,
                "SARASafeguard": 15.5,
                "AssetType": "N/A",
                "SecurityFunction": "Identify",
                "Title": "Assess Service Providers",
                "Description": "Assess service providers consistent with the enterprise’s service provider management policy. Assessment scope may vary based on classification(s), and may include review of standardized assessment reports, such as Service Organization Control 2 (SOC 2) and Payment Card Industry (PCI) Attestation of Compliance (AoC), customized questionnaires, or other appropriately rigorous processes. Reassess service providers annually, at a minimum, or with new and renewed contracts.",
                "Relationship": "Subset",
                "Control": 5.19,
                "ControlTitle": "Information security in supplier relationships",
                "ControlText": "Processes and procedures should be defined and implemented to manage the information security risks associated with the use of supplier’s products or services."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 15,
                "SARASafeguard": 15.5,
                "AssetType": "N/A",
                "SecurityFunction": "Identify",
                "Title": "Assess Service Providers",
                "Description": "Assess service providers consistent with the enterprise’s service provider management policy. Assessment scope may vary based on classification(s), and may include review of standardized assessment reports, such as Service Organization Control 2 (SOC 2) and Payment Card Industry (PCI) Attestation of Compliance (AoC), customized questionnaires, or other appropriately rigorous processes. Reassess service providers annually, at a minimum, or with new and renewed contracts.",
                "Relationship": "Subset",
                "Control": 5.22,
                "ControlTitle": "Monitoring, review and change management of supplier services",
                "ControlText": "The organization should regularly monitor, review, evaluate and manage change in supplier information security practices and service delivery."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 15,
                "SARASafeguard": 15.5,
                "AssetType": "N/A",
                "SecurityFunction": "Identify",
                "Title": "Assess Service Providers",
                "Description": "Assess service providers consistent with the enterprise’s service provider management policy. Assessment scope may vary based on classification(s), and may include review of standardized assessment reports, such as Service Organization Control 2 (SOC 2) and Payment Card Industry (PCI) Attestation of Compliance (AoC), customized questionnaires, or other appropriately rigorous processes. Reassess service providers annually, at a minimum, or with new and renewed contracts.",
                "Relationship": "Subset",
                "Control": 5.23,
                "ControlTitle": "Information security for use of cloud services",
                "ControlText": "Processes for acquisition, use, management and exit from cloud services should be established in accordance with the organization’s information security requirements."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 15,
                "SARASafeguard": 15.6,
                "AssetType": "Data",
                "SecurityFunction": "Detect",
                "Title": "Monitor Service Providers",
                "Description": "Monitor service providers consistent with the enterprise’s service provider management policy. Monitoring may include periodic reassessment of service provider compliance, monitoring service provider release notes, and dark web monitoring.",
                "Relationship": "Subset",
                "Control": 5.19,
                "ControlTitle": "Information security in supplier relationships",
                "ControlText": "Processes and procedures should be defined and implemented to manage the information security risks associated with the use of supplier’s products or services."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 15,
                "SARASafeguard": 15.6,
                "AssetType": "Data",
                "SecurityFunction": "Detect",
                "Title": "Monitor Service Providers",
                "Description": "Monitor service providers consistent with the enterprise’s service provider management policy. Monitoring may include periodic reassessment of service provider compliance, monitoring service provider release notes, and dark web monitoring.",
                "Relationship": "Subset",
                "Control": 5.2,
                "ControlTitle": "Addressing information security within supplier agreements",
                "ControlText": "Relevant information security requirements should be established and agreed with each supplier based on the type of supplier relationship."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 15,
                "SARASafeguard": 15.6,
                "AssetType": "Data",
                "SecurityFunction": "Detect",
                "Title": "Monitor Service Providers",
                "Description": "Monitor service providers consistent with the enterprise’s service provider management policy. Monitoring may include periodic reassessment of service provider compliance, monitoring service provider release notes, and dark web monitoring.",
                "Relationship": "Subset",
                "Control": 5.21,
                "ControlTitle": "Managing information security in the ICT supply chain",
                "ControlText": "Processes and procedures should be defined and implemented to manage information security risks associated with the ICT products and services supply chain."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 15,
                "SARASafeguard": 15.6,
                "AssetType": "Data",
                "SecurityFunction": "Detect",
                "Title": "Monitor Service Providers",
                "Description": "Monitor service providers consistent with the enterprise’s service provider management policy. Monitoring may include periodic reassessment of service provider compliance, monitoring service provider release notes, and dark web monitoring.",
                "Relationship": "Subset",
                "Control": 5.22,
                "ControlTitle": "Monitoring, review and change management of supplier services",
                "ControlText": "The organization should regularly monitor, review, evaluate and manage change in supplier information security practices and service delivery."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 15,
                "SARASafeguard": 15.7,
                "AssetType": "Data",
                "SecurityFunction": "Protect",
                "Title": "Securely Decommission Service Providers",
                "Description": "Securely decommission service providers. Example considerations include user and service account deactivation, termination of data flows, and secure disposal of enterprise data within service provider systems.",
                "Relationship": "Subset",
                "Control": 5.19,
                "ControlTitle": "Information security in supplier relationships",
                "ControlText": "Processes and procedures should be defined and implemented to manage the information security risks associated with the use of supplier’s products or services."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 15,
                "SARASafeguard": 15.7,
                "AssetType": "Data",
                "SecurityFunction": "Protect",
                "Title": "Securely Decommission Service Providers",
                "Description": "Securely decommission service providers. Example considerations include user and service account deactivation, termination of data flows, and secure disposal of enterprise data within service provider systems.",
                "Relationship": "Subset",
                "Control": 5.2,
                "ControlTitle": "Addressing information security within supplier agreements",
                "ControlText": "Relevant information security requirements should be established and agreed with each supplier based on the type of supplier relationship."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 16,
                "SARASafeguard": 16.1,
                "AssetType": "Applications",
                "SecurityFunction": "Protect",
                "Title": "Establish and Maintain a Secure Application Development Process",
                "Description": "Establish and maintain a secure application development process. In the process, address such items as: secure application design standards, secure coding practices, developer training, vulnerability management, security of third-party code, and application security testing procedures. Review and update documentation annually, or when significant enterprise changes occur that could impact this Safeguard.",
                "Relationship": "Subset",
                "Control": 5.1,
                "ControlTitle": "Policies for information security",
                "ControlText": "Information security policy and topic-specific policies should be defined, approved by management, published, communicated to and acknowledged by relevant personnel and relevant interested parties, and reviewed at planned intervals and if significant changes occur."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 16,
                "SARASafeguard": 16.1,
                "AssetType": "Applications",
                "SecurityFunction": "Protect",
                "Title": "Establish and Maintain a Secure Application Development Process",
                "Description": "Establish and maintain a secure application development process. In the process, address such items as: secure application design standards, secure coding practices, developer training, vulnerability management, security of third-party code, and application security testing procedures. Review and update documentation annually, or when significant enterprise changes occur that could impact this Safeguard.",
                "Relationship": "Subset",
                "Control": 5.8,
                "ControlTitle": "Information security in project management",
                "ControlText": "Information security should be integrated into project management."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 16,
                "SARASafeguard": 16.1,
                "AssetType": "Applications",
                "SecurityFunction": "Protect",
                "Title": "Establish and Maintain a Secure Application Development Process",
                "Description": "Establish and maintain a secure application development process. In the process, address such items as: secure application design standards, secure coding practices, developer training, vulnerability management, security of third-party code, and application security testing procedures. Review and update documentation annually, or when significant enterprise changes occur that could impact this Safeguard.",
                "Relationship": "Superset",
                "Control": 8.4,
                "ControlTitle": "Access to source code",
                "ControlText": "Read and write access to source code, development tools and software libraries should be appropriately managed."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 16,
                "SARASafeguard": 16.1,
                "AssetType": "Applications",
                "SecurityFunction": "Protect",
                "Title": "Establish and Maintain a Secure Application Development Process",
                "Description": "Establish and maintain a secure application development process. In the process, address such items as: secure application design standards, secure coding practices, developer training, vulnerability management, security of third-party code, and application security testing procedures. Review and update documentation annually, or when significant enterprise changes occur that could impact this Safeguard.",
                "Relationship": "Superset",
                "Control": 8.25,
                "ControlTitle": "Secure development life cycle",
                "ControlText": "Rules for the secure development of software and systems should be established and applied."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 16,
                "SARASafeguard": 16.1,
                "AssetType": "Applications",
                "SecurityFunction": "Protect",
                "Title": "Establish and Maintain a Secure Application Development Process",
                "Description": "Establish and maintain a secure application development process. In the process, address such items as: secure application design standards, secure coding practices, developer training, vulnerability management, security of third-party code, and application security testing procedures. Review and update documentation annually, or when significant enterprise changes occur that could impact this Safeguard.",
                "Relationship": "Superset",
                "Control": 8.28,
                "ControlTitle": "Secure coding",
                "ControlText": "Secure coding principles should be applied to software development."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 16,
                "SARASafeguard": 16.11,
                "AssetType": "Applications",
                "SecurityFunction": "Protect",
                "Title": "Leverage Vetted Modules or Services for Application Security Components",
                "Description": "Leverage vetted modules or services for application security components, such as identity management, encryption, and auditing and logging. Using platform features in critical security functions will reduce developers’ workload and minimize the likelihood of design or implementation errors. Modern operating systems provide effective mechanisms for identification, authentication, and authorization and make those mechanisms available to applications. Use only standardized, currently accepted, and extensively reviewed encryption algorithms. Operating systems also provide mechanisms to create and maintain secure audit logs.",
                "Relationship": "Superset",
                "Control": 8.25,
                "ControlTitle": "Secure development life cycle",
                "ControlText": "Rules for the secure development of software and systems should be established and applied."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 16,
                "SARASafeguard": 16.11,
                "AssetType": "Applications",
                "SecurityFunction": "Protect",
                "Title": "Leverage Vetted Modules or Services for Application Security Components",
                "Description": "Leverage vetted modules or services for application security components, such as identity management, encryption, and auditing and logging. Using platform features in critical security functions will reduce developers’ workload and minimize the likelihood of design or implementation errors. Modern operating systems provide effective mechanisms for identification, authentication, and authorization and make those mechanisms available to applications. Use only standardized, currently accepted, and extensively reviewed encryption algorithms. Operating systems also provide mechanisms to create and maintain secure audit logs.",
                "Relationship": "Subset",
                "Control": 8.26,
                "ControlTitle": "Application security requirements",
                "ControlText": "Information security requirements should be identified, specified and approved when developing or acquiring applications."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 16,
                "SARASafeguard": 16.12,
                "AssetType": "Applications",
                "SecurityFunction": "Protect",
                "Title": "Implement Code-Level Security Checks",
                "Description": "Apply static and dynamic analysis tools within the application life cycle to verify that secure coding practices are being followed.",
                "Relationship": "Subset",
                "Control": 8.25,
                "ControlTitle": "Secure development life cycle",
                "ControlText": "Rules for the secure development of software and systems should be established and applied."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 16,
                "SARASafeguard": 16.12,
                "AssetType": "Applications",
                "SecurityFunction": "Protect",
                "Title": "Implement Code-Level Security Checks",
                "Description": "Apply static and dynamic analysis tools within the application life cycle to verify that secure coding practices are being followed.",
                "Relationship": "Subset",
                "Control": 8.28,
                "ControlTitle": "Secure coding",
                "ControlText": "Secure coding principles should be applied to software development."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 16,
                "SARASafeguard": 16.12,
                "AssetType": "Applications",
                "SecurityFunction": "Protect",
                "Title": "Implement Code-Level Security Checks",
                "Description": "Apply static and dynamic analysis tools within the application life cycle to verify that secure coding practices are being followed.",
                "Relationship": "Subset",
                "Control": 8.29,
                "ControlTitle": "Security testing in development and acceptance",
                "ControlText": "Security testing processes should be defined and implemented in the development life cycle."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 16,
                "SARASafeguard": 16.13,
                "AssetType": "Applications",
                "SecurityFunction": "Protect",
                "Title": "Conduct Application Penetration Testing",
                "Description": "Conduct application penetration testing. For critical applications, authenticated penetration testing is better suited to finding business logic vulnerabilities than code scanning and automated security testing. Penetration testing relies on the skill of the tester to manually manipulate an application as an authenticated and unauthenticated user.",
                "Relationship": "Subset",
                "Control": 8.29,
                "ControlTitle": "Security testing in development and acceptance",
                "ControlText": "Security testing processes should be defined and implemented in the development life cycle."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 16,
                "SARASafeguard": 16.14,
                "AssetType": "Applications",
                "SecurityFunction": "Protect",
                "Title": "Conduct Threat Modeling",
                "Description": "Conduct threat modeling. Threat modeling is the process of identifying and addressing application security design flaws within a design, before code is created. It is conducted through specially trained individuals who evaluate the application design and gauge security risks for each entry point and access level. The goal is to map out the application, architecture, and infrastructure in a structured way to understand its weaknesses.",
                "Relationship": "",
                "Control": "",
                "ControlTitle": "",
                "ControlText": ""
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 16,
                "SARASafeguard": 16.2,
                "AssetType": "Applications",
                "SecurityFunction": "Protect",
                "Title": "Establish and Maintain a Process to Accept and Address Software Vulnerabilities",
                "Description": "Establish and maintain a process to accept and address reports of software vulnerabilities, including providing a means for external entities to report. The process is to include such items as: a vulnerability handling policy that identifies reporting process, responsible party for handling vulnerability reports, and a process for intake, assignment, remediation, and remediation testing. As part of the process, use a vulnerability tracking system that includes severity ratings, and metrics for measuring timing for identification, analysis, and remediation of vulnerabilities. Review and update documentation annually, or when significant enterprise changes occur that could impact this Safeguard.\n\nThird-party application developers need to consider this an externally-facing policy that helps to set expectations for outside stakeholders.",
                "Relationship": "Superset",
                "Control": 8.25,
                "ControlTitle": "Secure development life cycle",
                "ControlText": "Rules for the secure development of software and systems should be established and applied."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 16,
                "SARASafeguard": 16.3,
                "AssetType": "Applications",
                "SecurityFunction": "Protect",
                "Title": "Perform Root Cause Analysis on Security Vulnerabilities",
                "Description": "Perform root cause analysis on security vulnerabilities. When reviewing vulnerabilities, root cause analysis is the task of evaluating underlying issues that create vulnerabilities in code, and allows development teams to move beyond just fixing individual vulnerabilities as they arise.",
                "Relationship": "",
                "Control": "",
                "ControlTitle": "",
                "ControlText": ""
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 16,
                "SARASafeguard": 16.4,
                "AssetType": "Applications",
                "SecurityFunction": "Protect",
                "Title": "Establish and Manage an Inventory of Third-Party Software Components",
                "Description": "Establish and manage an updated inventory of third-party components used in development, often referred to as a “bill of materials,” as well as components slated for future use. This inventory is to include any risks that each third-party component could pose. Evaluate the list at least monthly to identify any changes or updates to these components, and validate that the component is still supported.",
                "Relationship": "Subset",
                "Control": 8.26,
                "ControlTitle": "Application security requirements",
                "ControlText": "Information security requirements should be identified, specified and approved when developing or acquiring applications."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 16,
                "SARASafeguard": 16.4,
                "AssetType": "Applications",
                "SecurityFunction": "Protect",
                "Title": "Establish and Manage an Inventory of Third-Party Software Components",
                "Description": "Establish and manage an updated inventory of third-party components used in development, often referred to as a “bill of materials,” as well as components slated for future use. This inventory is to include any risks that each third-party component could pose. Evaluate the list at least monthly to identify any changes or updates to these components, and validate that the component is still supported.",
                "Relationship": "Subset",
                "Control": 8.3,
                "ControlTitle": "Outsourced development",
                "ControlText": "The organization should direct, monitor and review the activities related to outsourced system development."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 16,
                "SARASafeguard": 16.5,
                "AssetType": "Applications",
                "SecurityFunction": "Protect",
                "Title": "Use Up-to-Date and Trusted Third-Party Software Components",
                "Description": "Use up-to-date and trusted third-party software components. When possible, choose established and proven frameworks and libraries that provide adequate security. Acquire these components from trusted sources or evaluate the software for vulnerabilities before use.",
                "Relationship": "Subset",
                "Control": 8.26,
                "ControlTitle": "Application security requirements",
                "ControlText": "Information security requirements should be identified, specified and approved when developing or acquiring applications."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 16,
                "SARASafeguard": 16.6,
                "AssetType": "Applications",
                "SecurityFunction": "Protect",
                "Title": "Establish and Maintain a Severity Rating System and Process for Application Vulnerabilities",
                "Description": "Establish and maintain a severity rating system and process for application vulnerabilities that facilitates prioritizing the order in which discovered vulnerabilities are fixed. This process includes setting a minimum level of security acceptability for releasing code or applications. Severity ratings bring a systematic way of triaging vulnerabilities that improves risk management and helps ensure the most severe bugs are fixed first. Review and update the system and process annually.",
                "Relationship": "Subset",
                "Control": 8.28,
                "ControlTitle": "Secure coding",
                "ControlText": "Secure coding principles should be applied to software development."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 16,
                "SARASafeguard": 16.7,
                "AssetType": "Applications",
                "SecurityFunction": "Protect",
                "Title": "Use Standard Hardening Configuration Templates for Application Infrastructure",
                "Description": "Use standard, industry-recommended hardening configuration templates for application infrastructure components. This includes underlying servers, databases, and web servers, and applies to cloud containers, Platform as a Service (PaaS) components, and SaaS components. Do not allow in-house developed software to weaken configuration hardening.",
                "Relationship": "",
                "Control": "",
                "ControlTitle": "",
                "ControlText": ""
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 16,
                "SARASafeguard": 16.8,
                "AssetType": "Applications",
                "SecurityFunction": "Protect",
                "Title": "Separate Production and Non-Production Systems",
                "Description": "Maintain separate environments for production and non-production systems.",
                "Relationship": "Equivalent",
                "Control": 8.31,
                "ControlTitle": "Separation of development, test and production environments",
                "ControlText": "Development, testing and production environments should be separated and secured."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 16,
                "SARASafeguard": 16.9,
                "AssetType": "Applications",
                "SecurityFunction": "Protect",
                "Title": "Train Developers in Application Security Concepts and Secure Coding",
                "Description": "Ensure that all software development personnel receive training in writing secure code for their specific development environment and responsibilities. Training can include general security principles and application security standard practices. Conduct training at least annually and design in a way to promote security within the development team, and build a culture of security among the developers.",
                "Relationship": "Subset",
                "Control": 8.28,
                "ControlTitle": "Secure coding",
                "ControlText": "Secure coding principles should be applied to software development."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 17,
                "SARASafeguard": 17.1,
                "AssetType": "N/A",
                "SecurityFunction": "Respond",
                "Title": "Designate Personnel to Manage Incident Handling",
                "Description": "Designate one key person, and at least one backup, who will manage the enterprise’s incident handling process. Management personnel are responsible for the coordination and documentation of incident response and recovery efforts and can consist of employees internal to the enterprise, third-party vendors, or a hybrid approach. If using a third-party vendor, designate at least one person internal to the enterprise to oversee any third-party work. Review annually, or when significant enterprise changes occur that could impact this Safeguard.",
                "Relationship": "Subset",
                "Control": 5.24,
                "ControlTitle": "Information security incident management planning and preparation",
                "ControlText": "The organization should plan and prepare for managing information security incidents by defining, establishing and communicating information security incident management processes, roles and responsibilities."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 17,
                "SARASafeguard": 17.2,
                "AssetType": "N/A",
                "SecurityFunction": "Respond",
                "Title": "Establish and Maintain Contact Information for Reporting Security Incidents",
                "Description": "Establish and maintain contact information for parties that need to be informed of security incidents. Contacts may include internal staff, third-party vendors, law enforcement, cyber insurance providers, relevant government agencies, Information Sharing and Analysis Center (ISAC) partners, or other stakeholders. Verify contacts annually to ensure that information is up-to-date.",
                "Relationship": "Superset",
                "Control": 5.5,
                "ControlTitle": "Contact with authorities",
                "ControlText": "The organization should establish and maintain contact with relevant authorities."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 17,
                "SARASafeguard": 17.2,
                "AssetType": "N/A",
                "SecurityFunction": "Respond",
                "Title": "Establish and Maintain Contact Information for Reporting Security Incidents",
                "Description": "Establish and maintain contact information for parties that need to be informed of security incidents. Contacts may include internal staff, third-party vendors, law enforcement, cyber insurance providers, relevant government agencies, Information Sharing and Analysis Center (ISAC) partners, or other stakeholders. Verify contacts annually to ensure that information is up-to-date.",
                "Relationship": "Subset",
                "Control": 5.6,
                "ControlTitle": "Contact with special interest groups",
                "ControlText": "The organization should establish and maintain contact with special interest groups or other specialist security forums and professional associations."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 17,
                "SARASafeguard": 17.2,
                "AssetType": "N/A",
                "SecurityFunction": "Respond",
                "Title": "Establish and Maintain Contact Information for Reporting Security Incidents",
                "Description": "Establish and maintain contact information for parties that need to be informed of security incidents. Contacts may include internal staff, third-party vendors, law enforcement, cyber insurance providers, relevant government agencies, Information Sharing and Analysis Center (ISAC) partners, or other stakeholders. Verify contacts annually to ensure that information is up-to-date.",
                "Relationship": "Subset",
                "Control": 5.2,
                "ControlTitle": "Addressing information security within supplier agreements",
                "ControlText": "Relevant information security requirements should be established and agreed with each supplier based on the type of supplier relationship."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 17,
                "SARASafeguard": 17.2,
                "AssetType": "N/A",
                "SecurityFunction": "Respond",
                "Title": "Establish and Maintain Contact Information for Reporting Security Incidents",
                "Description": "Establish and maintain contact information for parties that need to be informed of security incidents. Contacts may include internal staff, third-party vendors, law enforcement, cyber insurance providers, relevant government agencies, Information Sharing and Analysis Center (ISAC) partners, or other stakeholders. Verify contacts annually to ensure that information is up-to-date.",
                "Relationship": "Subset",
                "Control": 5.24,
                "ControlTitle": "Information security incident management planning and preparation",
                "ControlText": "The organization should plan and prepare for managing information security incidents by defining, establishing and communicating information security incident management processes, roles and responsibilities."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 17,
                "SARASafeguard": 17.3,
                "AssetType": "N/A",
                "SecurityFunction": "Respond",
                "Title": "Establish and Maintain an Enterprise Process for Reporting Incidents",
                "Description": "Establish and maintain an enterprise process for the workforce to report security incidents. The process includes reporting timeframe, personnel to report to, mechanism for reporting, and the minimum information to be reported. Ensure the process is publicly available to all of the workforce. Review annually, or when significant enterprise changes occur that could impact this Safeguard.",
                "Relationship": "Equivalent",
                "Control": 6.8,
                "ControlTitle": "Information security event reporting",
                "ControlText": "The organization should provide a mechanism for personnel to report observed or suspected information security events through appropriate channels in a timely manner."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 17,
                "SARASafeguard": 17.4,
                "AssetType": "N/A",
                "SecurityFunction": "Respond",
                "Title": "Establish and Maintain an Incident Response Process",
                "Description": "Establish and maintain an incident response process that addresses roles and responsibilities, compliance requirements, and a communication plan. Review annually, or when significant enterprise changes occur that could impact this Safeguard.",
                "Relationship": "Subset",
                "Control": 5.1,
                "ControlTitle": "Policies for information security",
                "ControlText": "Information security policy and topic-specific policies should be defined, approved by management, published, communicated to and acknowledged by relevant personnel and relevant interested parties, and reviewed at planned intervals and if significant changes occur."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 17,
                "SARASafeguard": 17.4,
                "AssetType": "N/A",
                "SecurityFunction": "Respond",
                "Title": "Establish and Maintain an Incident Response Process",
                "Description": "Establish and maintain an incident response process that addresses roles and responsibilities, compliance requirements, and a communication plan. Review annually, or when significant enterprise changes occur that could impact this Safeguard.",
                "Relationship": "Subset",
                "Control": 5.24,
                "ControlTitle": "Information security incident management planning and preparation",
                "ControlText": "The organization should plan and prepare for managing information security incidents by defining, establishing and communicating information security incident management processes, roles and responsibilities."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 17,
                "SARASafeguard": 17.4,
                "AssetType": "N/A",
                "SecurityFunction": "Respond",
                "Title": "Establish and Maintain an Incident Response Process",
                "Description": "Establish and maintain an incident response process that addresses roles and responsibilities, compliance requirements, and a communication plan. Review annually, or when significant enterprise changes occur that could impact this Safeguard.",
                "Relationship": "Subset",
                "Control": 5.26,
                "ControlTitle": "Response to information security incidents",
                "ControlText": "Information security incidents should be responded to in accordance with the documented procedures."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 17,
                "SARASafeguard": 17.5,
                "AssetType": "N/A",
                "SecurityFunction": "Respond",
                "Title": "Assign Key Roles and Responsibilities",
                "Description": "Assign key roles and responsibilities for incident response, including staff from legal, IT, information security, facilities, public relations, human resources, incident responders, and analysts, as applicable. Review annually, or when significant enterprise changes occur that could impact this Safeguard.",
                "Relationship": "Subset",
                "Control": 5.2,
                "ControlTitle": "Information security roles and responsibilities",
                "ControlText": "Information security roles and responsibilities should be defined and allocated according to the organization needs."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 17,
                "SARASafeguard": 17.5,
                "AssetType": "N/A",
                "SecurityFunction": "Respond",
                "Title": "Assign Key Roles and Responsibilities",
                "Description": "Assign key roles and responsibilities for incident response, including staff from legal, IT, information security, facilities, public relations, human resources, incident responders, and analysts, as applicable. Review annually, or when significant enterprise changes occur that could impact this Safeguard.",
                "Relationship": "Subset",
                "Control": 5.24,
                "ControlTitle": "Information security incident management planning and preparation",
                "ControlText": "The organization should plan and prepare for managing information security incidents by defining, establishing and communicating information security incident management processes, roles and responsibilities."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 17,
                "SARASafeguard": 17.6,
                "AssetType": "N/A",
                "SecurityFunction": "Respond",
                "Title": "Define Mechanisms for Communicating During Incident Response",
                "Description": "Determine which primary and secondary mechanisms will be used to communicate and report during a security incident. Mechanisms can include phone calls, emails, or letters. Keep in mind that certain mechanisms, such as emails, can be affected during a security incident. Review annually, or when significant enterprise changes occur that could impact this Safeguard.",
                "Relationship": "",
                "Control": "",
                "ControlTitle": "",
                "ControlText": ""
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 17,
                "SARASafeguard": 17.7,
                "AssetType": "N/A",
                "SecurityFunction": "Recover",
                "Title": "Conduct Routine Incident Response Exercises",
                "Description": "Plan and conduct routine incident response exercises and scenarios for key personnel involved in the incident response process to prepare for responding to real-world incidents. Exercises need to test communication channels, decision making, and workflows. Conduct testing on an annual basis, at a minimum.",
                "Relationship": "Subset",
                "Control": 5.3,
                "ControlTitle": "ICT readiness for business continuity",
                "ControlText": "ICT readiness should be planned, implemented, maintained and tested based on business continuity objectives and ICT continuity requirements."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 17,
                "SARASafeguard": 17.8,
                "AssetType": "N/A",
                "SecurityFunction": "Recover",
                "Title": "Conduct Post-Incident Reviews",
                "Description": "Conduct post-incident reviews. Post-incident reviews help prevent incident recurrence through identifying lessons learned and follow-up action.",
                "Relationship": "Subset",
                "Control": 5.24,
                "ControlTitle": "Information security incident management planning and preparation",
                "ControlText": "The organization should plan and prepare for managing information security incidents by defining, establishing and communicating information security incident management processes, roles and responsibilities."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 17,
                "SARASafeguard": 17.8,
                "AssetType": "N/A",
                "SecurityFunction": "Recover",
                "Title": "Conduct Post-Incident Reviews",
                "Description": "Conduct post-incident reviews. Post-incident reviews help prevent incident recurrence through identifying lessons learned and follow-up action.",
                "Relationship": "Subset",
                "Control": 5.26,
                "ControlTitle": "Response to information security incidents",
                "ControlText": "Information security incidents should be responded to in accordance with the documented procedures."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 17,
                "SARASafeguard": 17.8,
                "AssetType": "N/A",
                "SecurityFunction": "Recover",
                "Title": "Conduct Post-Incident Reviews",
                "Description": "Conduct post-incident reviews. Post-incident reviews help prevent incident recurrence through identifying lessons learned and follow-up action.",
                "Relationship": "Subset",
                "Control": 5.27,
                "ControlTitle": "Learning from information security incidents",
                "ControlText": "Knowledge gained from information security incidents should be used to strengthen and improve the information security controls."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 17,
                "SARASafeguard": 17.9,
                "AssetType": "N/A",
                "SecurityFunction": "Recover",
                "Title": "Establish and Maintain Security Incident Thresholds",
                "Description": "Establish and maintain security incident thresholds, including, at a minimum, differentiating between an incident and an event. Examples can include: abnormal activity, security vulnerability, security weakness, data breach, privacy incident, etc. Review annually, or when significant enterprise changes occur that could impact this Safeguard.",
                "Relationship": "Subset",
                "Control": 5.24,
                "ControlTitle": "Information security incident management planning and preparation",
                "ControlText": "The organization should plan and prepare for managing information security incidents by defining, establishing and communicating information security incident management processes, roles and responsibilities."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 17,
                "SARASafeguard": 17.9,
                "AssetType": "N/A",
                "SecurityFunction": "Recover",
                "Title": "Establish and Maintain Security Incident Thresholds",
                "Description": "Establish and maintain security incident thresholds, including, at a minimum, differentiating between an incident and an event. Examples can include: abnormal activity, security vulnerability, security weakness, data breach, privacy incident, etc. Review annually, or when significant enterprise changes occur that could impact this Safeguard.",
                "Relationship": "Subset",
                "Control": 5.25,
                "ControlTitle": "Assessment and decision on information security events",
                "ControlText": "The organization should assess information security events and decide if they are to be categorized as information security incidents."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 18,
                "SARASafeguard": 18.1,
                "AssetType": "N/A",
                "SecurityFunction": "Identify",
                "Title": "Establish and Maintain a Penetration Testing Program",
                "Description": "Establish and maintain a penetration testing program appropriate to the size, complexity, and maturity of the enterprise. Penetration testing program characteristics include scope, such as network, web application, Application Programming Interface (API), hosted services, and physical premise controls; frequency; limitations, such as acceptable hours, and excluded attack types; point of contact information; remediation, such as how findings will be routed internally; and retrospective requirements.",
                "Relationship": "Superset",
                "Control": 8.34,
                "ControlTitle": "Protection of information systems during audit testing",
                "ControlText": "Audit tests and other assurance activities involving assessment of operational systems should be planned and agreed between the tester and appropriate management."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 18,
                "SARASafeguard": 18.2,
                "AssetType": "Network",
                "SecurityFunction": "Identify",
                "Title": "Perform Periodic External Penetration Tests",
                "Description": "Perform periodic external penetration tests based on program requirements, no less than annually. External penetration testing must include enterprise and environmental reconnaissance to detect exploitable information. Penetration testing requires specialized skills and experience and must be conducted through a qualified party. The testing may be clear box or opaque box.",
                "Relationship": "Subset",
                "Control": 8.8,
                "ControlTitle": "Management of technical vulnerabilities",
                "ControlText": "Information about technical vulnerabilities of information systems in use should be obtained, the organization’s exposure to such vulnerabilities should be evaluated and appropriate measures should be taken."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 18,
                "SARASafeguard": 18.3,
                "AssetType": "Network",
                "SecurityFunction": "Protect",
                "Title": "Remediate Penetration Test Findings",
                "Description": "Remediate penetration test findings based on the enterprise’s policy for remediation scope and prioritization.",
                "Relationship": "",
                "Control": "",
                "ControlTitle": "",
                "ControlText": ""
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 18,
                "SARASafeguard": 18.4,
                "AssetType": "Network",
                "SecurityFunction": "Protect",
                "Title": "Validate Security Measures",
                "Description": "Validate security measures after each penetration test. If deemed necessary, modify rulesets and capabilities to detect the techniques used during testing.",
                "Relationship": "",
                "Control": "",
                "ControlTitle": "",
                "ControlText": ""
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 18,
                "SARASafeguard": 18.5,
                "AssetType": "N/A",
                "SecurityFunction": "Identify",
                "Title": "Perform Periodic Internal Penetration Tests",
                "Description": "Perform periodic internal penetration tests based on program requirements, no less than annually. The testing may be clear box or opaque box.",
                "Relationship": "",
                "Control": "",
                "ControlTitle": "",
                "ControlText": ""
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 13,
                "SARASafeguard": 13.1,
                "AssetType": "Network",
                "SecurityFunction": "Protect",
                "Title": "Perform Application Layer Filtering",
                "Description": "Perform application layer filtering. Example implementations include a filtering proxy, application layer firewall, or gateway.",
                "Relationship": "",
                "Control": "",
                "ControlTitle": "",
                "ControlText": ""
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 16,
                "SARASafeguard": 16.1,
                "AssetType": "Applications",
                "SecurityFunction": "Protect",
                "Title": "Apply Secure Design Principles in Application Architectures",
                "Description": "Apply secure design principles in application architectures. Secure design principles include the concept of least privilege and enforcing mediation to validate every operation that the user makes, promoting the concept of \"never trust user input.\" Examples include ensuring that explicit error checking is performed and documented for all input, including for size, data type, and acceptable ranges or formats. Secure design also means minimizing the application infrastructure attack surface, such as turning off unprotected ports and services, removing unnecessary programs and files, and renaming or removing default accounts.",
                "Relationship": "Subset",
                "Control": 8.27,
                "ControlTitle": "Secure system architecture and engineering principles",
                "ControlText": "Principles for engineering secure systems to be established, documented, maintained and applied to any information system development activities."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 3,
                "SARASafeguard": 3.1,
                "AssetType": "Data",
                "SecurityFunction": "Protect",
                "Title": "Encrypt Sensitive Data in Transit",
                "Description": "Encrypt sensitive data in transit. Example implementations can include: Transport Layer Security (TLS) and Open Secure Shell (OpenSSH).",
                "Relationship": "Subset",
                "Control": 5.14,
                "ControlTitle": "Information transfer",
                "ControlText": "Information transfer rules, procedures, or agreements should be in place for all types of transfer facilities within the organization and between the organization and other parties."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 4,
                "SARASafeguard": 4.1,
                "AssetType": "Devices",
                "SecurityFunction": "Respond",
                "Title": "Enforce Automatic Device Lockout on Portable End-User Devices",
                "Description": "Enforce automatic device lockout following a predetermined threshold of local failed authentication attempts on portable end-user devices, where supported. For laptops, do not allow more than 20 failed authentication attempts; for tablets and smartphones, no more than 10 failed authentication attempts. Example implementations include Microsoft® InTune Device Lock and Apple® Configuration Profile maxFailedAttempts.",
                "Relationship": "Subset",
                "Control": 8.5,
                "ControlTitle": "Secure authentication",
                "ControlText": "Secure authentication technologies and procedures should be implemented based on information access restrictions and the topic-specific policy on access control."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 6,
                "SARASafeguard": 6.1,
                "AssetType": "Users",
                "SecurityFunction": "Protect",
                "Title": "Establish an Access Granting Process",
                "Description": "Establish and follow a process, preferably automated, for granting access to enterprise assets upon new hire, rights grant, or role change of a user.",
                "Relationship": "Subset",
                "Control": 5.15,
                "ControlTitle": "Access control",
                "ControlText": "The full life cycle of identities should be managed."
            },
            {
                "Compliance": "ISO27002",
                "SARAControl": 8,
                "SARASafeguard": 8.1,
                "AssetType": "Network",
                "SecurityFunction": "Protect",
                "Title": "Retain Audit Logs",
                "Description": "Retain audit logs across enterprise assets for a minimum of 90 days.",
                "Relationship": "Subset",
                "Control": 5.28,
                "ControlTitle": "Collection of evidence",
                "ControlText": "The organization should establish and implement procedures for the identification, collection, acquisition and preservation of evidence related to information security events."
            }
        ]


}


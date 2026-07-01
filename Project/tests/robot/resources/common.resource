*** Settings ***
Library    RequestsLibrary
Library    Collections
Library    OperatingSystem
Library    String
Library    JSONLibrary
Variables  ../variables/env.py

*** Variables ***
${API_PREFIX}    /api/v1

*** Keywords ***
Start API Session
    Create Session    api    ${BASE_URL}    verify=${False}

Stop API Session
    Delete All Sessions

Build JSON Headers
    ${headers}=    Create Dictionary    Content-Type=application/json    Accept=application/json
    RETURN    ${headers}

Build Auth Headers
    [Arguments]    ${token}
    ${headers}=    Build JSON Headers
    Set To Dictionary    ${headers}    Authorization=Bearer ${token}
    RETURN    ${headers}

POST API
    [Arguments]    ${path}    ${payload}=${None}    ${token}=${None}
    ${headers}=    Run Keyword If    '${token}' == '${None}'    Build JSON Headers    ELSE    Build Auth Headers    ${token}
    ${response}=    POST On Session    api    ${path}    json=${payload}    headers=${headers}    expected_status=any
    RETURN    ${response}

GET API
    [Arguments]    ${path}    ${token}=${None}    ${params}=${None}
    ${headers}=    Run Keyword If    '${token}' == '${None}'    Build JSON Headers    ELSE    Build Auth Headers    ${token}
    ${response}=    GET On Session    api    ${path}    headers=${headers}    params=${params}    expected_status=any
    RETURN    ${response}

PUT API
    [Arguments]    ${path}    ${payload}=${None}    ${token}=${None}
    ${headers}=    Run Keyword If    '${token}' == '${None}'    Build JSON Headers    ELSE    Build Auth Headers    ${token}
    ${response}=    PUT On Session    api    ${path}    json=${payload}    headers=${headers}    expected_status=any
    RETURN    ${response}

PATCH API
    [Arguments]    ${path}    ${payload}=${None}    ${token}=${None}
    ${headers}=    Run Keyword If    '${token}' == '${None}'    Build JSON Headers    ELSE    Build Auth Headers    ${token}
    ${response}=    PATCH On Session    api    ${path}    json=${payload}    headers=${headers}    expected_status=any
    RETURN    ${response}

DELETE API
    [Arguments]    ${path}    ${token}=${None}
    ${headers}=    Run Keyword If    '${token}' == '${None}'    Build JSON Headers    ELSE    Build Auth Headers    ${token}
    ${response}=    DELETE On Session    api    ${path}    headers=${headers}    expected_status=any
    RETURN    ${response}

Status Should Be
    [Arguments]    ${response}    ${expected_status}
    Should Be Equal As Integers    ${response.status_code}    ${expected_status}

Response JSON Should Have Standard Shape
    [Arguments]    ${response}
    ${body}=    Set Variable    ${response.json()}
    Dictionary Should Contain Key    ${body}    success
    Dictionary Should Contain Key    ${body}    message
    Dictionary Should Contain Key    ${body}    data
    RETURN    ${body}

Error Response JSON Should Have Standard Shape
    [Arguments]    ${response}
    ${body}=    Set Variable    ${response.json()}
    Dictionary Should Contain Key    ${body}    success
    Dictionary Should Contain Key    ${body}    message
    Dictionary Should Contain Key    ${body}    errors
    RETURN    ${body}

Response Should Be Success
    [Arguments]    ${response}    ${expected_status}=200
    Status Should Be    ${response}    ${expected_status}
    ${body}=    Response JSON Should Have Standard Shape    ${response}
    Should Be True    ${body["success"]}
    RETURN    ${body}

Response Should Be Error
    [Arguments]    ${response}    ${expected_status}
    Status Should Be    ${response}    ${expected_status}
    ${body}=    Error Response JSON Should Have Standard Shape    ${response}
    Should Not Be True    ${body["success"]}
    RETURN    ${body}

Generate Unique Email
    [Arguments]    ${prefix}
    ${random}=    Generate Random String    8    [LOWER][NUMBERS]
    ${email}=    Set Variable    ${prefix}.${RUN_ID}.${random}@example.com
    RETURN    ${email}

Should Be UUID
    [Arguments]    ${value}
    Should Match Regexp    ${value}    ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$

Malformed POST API
    [Arguments]    ${path}    ${raw_body}    ${token}=${None}
    ${headers}=    Run Keyword If    '${token}' == '${None}'    Build JSON Headers    ELSE    Build Auth Headers    ${token}
    ${response}=    POST On Session    api    ${path}    data=${raw_body}    headers=${headers}    expected_status=any
    RETURN    ${response}

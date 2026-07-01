*** Settings ***
Documentation    Notification API tests.
Resource         ../resources/common.resource
Resource         ../resources/auth.resource
Suite Setup      Setup Notification Suite
Suite Teardown   Stop API Session

*** Keywords ***
Setup Notification Suite
    Start API Session
    Login As Customer

*** Test Cases ***
List Notifications
    ${response}=    GET API    ${API_PREFIX}/notifications    ${CUSTOMER_TOKEN}
    ${body}=    Response Should Be Success    ${response}
    Dictionary Should Contain Key    ${body["data"]}    items
    ${count}=    Get Length    ${body["data"]["items"]}
    Set Suite Variable    ${NOTIFICATION_COUNT}    ${count}
    IF    ${count} > 0
        Set Suite Variable    ${NOTIFICATION_ID}    ${body["data"]["items"][0]["id"]}
    END

Mark Notification Read
    Skip If    ${NOTIFICATION_COUNT} == 0    No notifications exist for this user yet.
    ${response}=    PATCH API    ${API_PREFIX}/notifications/${NOTIFICATION_ID}/read    ${None}    ${CUSTOMER_TOKEN}
    ${body}=    Response Should Be Success    ${response}
    Should Be True    ${body["data"]["notification"]["is_read"]}

Unauthorized Notification Access
    ${response}=    GET API    ${API_PREFIX}/notifications
    Response Should Be Error    ${response}    401


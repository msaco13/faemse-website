-- 2026-09-13: the bylaws in the member portal, and the 90-day grace window.
-- Paste once into the dashboard SQL Editor (Supabase project FAEMSE WEBSITE).
-- Safe to re-run: it replaces the function, keeps the table, and refreshes the
-- bylaws text.

-- 1. Membership gate. Bylaws 2.05 allow a membership to be revoked only once
--    dues are 90 days past the due date, so a member keeps member access for
--    90 days after the paid-through date. Admins are always current.
create or replace function public.is_current_member()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.role = 'admin'
           or (p.expires_at is not null and p.expires_at + 90 >= current_date))
  );
$$;

revoke all on function public.is_current_member() from public;
grant execute on function public.is_current_member() to authenticated;

-- 2. Documents members can read: the bylaws today, minutes or policies later.
--    Public visitors get nothing (no anon grant); current members read; admins
--    manage. The site shows the outline publicly and the full text here.
create table if not exists public.documents (
  slug text primary key,
  title text not null,
  body text not null,
  updated_at timestamptz not null default now()
);

alter table public.documents enable row level security;

drop policy if exists "members read documents" on public.documents;
create policy "members read documents" on public.documents
  for select to authenticated using ((select public.is_current_member()));

drop policy if exists "admins manage documents" on public.documents;
create policy "admins manage documents" on public.documents
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

grant select, insert, update, delete on public.documents to authenticated;

-- 3. The bylaws, current revision (September 10, 2021), as plain text. One
--    line per paragraph; the site formats article and section headings.
insert into public.documents (slug, title, body) values (
  'bylaws',
  'Bylaws of the Florida Association of Emergency Medical Services Educators',
  $bylaws$
Florida Association of EMS Educators Bylaws
ARTICLE 1
INTRODUCTION AND NAME
1.01 Charter / Executive Office
The name of the nonprofit corporation is the Florida Association of Emergency Medical Services Educators (FAEMSE), hereinafter called the Association, and is registered in the State of Florida as a not-for-profit 501(c)(6) corporation with its principal office located at: 2609 N. Forest Ridge Boulevard, Suite 151, Hernando, FL 34442.
The Association is subject to the limitations for organizations that qualify as exempt organizations under Section 501(c)(3) of the Internal Revenue Service Code and its regulations as they now exist or may hereafter be amended.
1.02 Other Offices
The Association may have offices within or without the State of Florida as the Board of Directors may from time to time determine, or that activities of the Association may require.
1.03 Mission
FAEMSE's mission is to provide resources to individuals and organizations that will foster excellence in EMS education and training.
1.04 Vision
The vision of FAEMSE is to be the foremost resource within Florida's EMS educational community.
ARTICLE 2
MEMBERSHIP
2.01 Eligibility
The members of the Association shall be those individuals who are involved or interested in the education and training of EMS and out-of-hospital personnel. Prospective members will be considered without regard to race, age, gender, creed or color.
2.02 Classes of Membership
There will be four classes of membership in the Association
Active Member
Honorary Member
Corporate Member
Institutional Member
2.02.01 Active Member
Active Members shall be individuals involved in the planning, supervision, teaching and clinical practice of out-of-hospital medical care. Active Members will be afforded all privileges of the Association, including voting rights, committee membership, election to offices and the right to advise the Association in the conduct of its affairs. The Board of Directors shall set annual membership fees.
2.02.02 Honorary Member
Honorary Members shall be those persons deemed by the Board of Directors to have demonstrated outstanding dedication to the field of emergency medical services, who have made significant contributions to the goals of the Association, and who have distinguished themselves in this field. Honorary Members are elected by the Board of Directors and may be nominated by members of the Association. Honorary Members shall not have the right to vote, the right to chair committees, or the right to hold office. Honorary Membership is a life-long title. They shall not be charged a membership fee.
2.02.03 Corporate Member
Corporate Members shall be groups interested in emergency medical services, and who are for-profit corporations, not-for-profit associations, governmental agencies, and similar entities. Each Corporate Member is allowed up to three representatives. Corporate Members may serve on committees, but may not make motions, vote, hold office, or chair committees of the FAEMSE. The Board Directors shall set annual membership fees.
2.02.04 Institutional Member
Institutional Members shall be those organizations involved in the planning, supervision, teaching and clinical practice of out-of-hospital medical care. Each Institutional Member may designate up to five representatives that will be considered Active Members and who will be afforded all privileges of Active Members, provided they meet the qualifications of such. The Board of Directors shall set annual membership fees.
2.03 Application for Membership
A prospective member shall submit an application for membership to the Secretary. The Secretary, or the Secretary's designee, shall review the application, verify and approve the candidate or reject the application for membership and in such form as it may deem appropriate. The procedures utilized by the Secretary or Secretary's designee shall be subject to the approval of the Board of Directors. Appropriate grounds for rejection shall include, but are not limited to, conviction of a felony, notice of official reprimand, sanction, or other negative action by a state regulatory body, unprofessional conduct, or unethical or immoral behavior. Appeal of the decision of the Secretary may be made to the Board of Directors, which shall establish rules governing said appeals in accordance with the tenets of reasonable process. The decision of the Board of Directors shall be final.
2.04 Appeal
Any applicant denied membership may appeal to the Board of Directors. The applicant shall have the right to address the Board of Directors in support of acceptance of the application. The Board of Directors shall vote on the appeal after receiving comments from all concerned parties. The Board of Directors will review any factual written material presented that has direct bearing on the applicant's request for membership. Its decision shall be considered final.
2.05 Revocation of Membership Status
Members who fail to pay dues within ninety (90) days of the payment due date or meet other requirements of membership, as determined by the Board of Directors, may have their membership in the Association revoked.
ARTICLE 3
MEETINGS
3.01 Regular Meetings
Regular meetings of the Association are usually held in conjunction with the Florida Advisory Council and Constituency Group meetings. The specific date and location of each meeting may be obtained from the Association Secretary or from contacting the Advisory Council Meeting Coordinator.
3.02 Annual Meeting
The annual meeting of the association will be held mid-year (typically in conjunction with the regular meeting of the Florida EMS Advisory Council meeting usually in July). The specific date and time of the meeting may be obtained from the Secretary or by contacting the Advisory Council Meeting Coordinator.
ARTICLE 4
DUES
4.01 Dues
Dues for Association members shall be set by the Board of Directors based on the annual operating budget. Prior to approving a change in dues, the Board of Directors shall communicate the proposed dues change to the membership of the Association for thirty (30) days prior to any change.
ARTICLE 5
BOARD OF DIRECTORS
5.01 Management
The Board of Directors, along with the Executive Director, shall be vested with the general management and oversight of the Association's affairs. Without limiting the foregoing, the Board of Directors shall supervise all funds; approve all budgets of the Association, including those of committees, elect auditors, and other officials of the Association.
5.02 Composition
The Board of Directors shall consist of the President, President-elect, immediate past president, the Secretary, and three Members-at-Large.
5.02.01 Ex-officio Member of the Board
The EMS Educator representative to the State of Florida's Department of Health, Bureau of EMS Advisory Council may serve as an ex-officio member of the Board of Directors of the FAEMSE. This person may attend board meetings, participate in discussions and committees but shall not have the power to make a motion or vote.
5.03 Eligibility
A member of the Board of Directors shall be an Active member in good standing of the Association. A member in good standing is defined by one who is current in dues and does not have any pending negative action as defined in section 2.03 of these bylaws.
5.04 Election of Directors
The Secretary, every odd numbered year, shall develop a list of nominees for the open Director positions. The position of President shall be filled by the President-elect. All other director positions shall be elected every two years. The list of nominees shall be distributed by US mail, e-mail, web, or other electronic means to the Active membership immediately following the first meeting of the calendar year. There shall be a space for write-in candidates on the ballot. Ballots shall be due back to the Association office by at least twenty (20) days prior to the second regular meeting of the calendar year. The elected candidates shall be determined by those receiving the highest number of votes. In the event of a tie, the Nominating Committee will re-ballot members. Elected Directors will take office at the third regular (Annual) meeting of the calendar year.
5.05 Resignation
A member of the Board of Directors may resign at any time. Such resignation shall be made in writing and shall take effect at the time specified therein, and if no time is specified, at the time of receipt by the Secretary. The acceptance of a resignation shall not be necessary to make it effective.
5.06 Vacancies
If a Director's position becomes vacant, the Board of Directors shall vote either to leave it vacant until the end of its term or to appoint a new Director to fill the remaining term.
5.07 The Terms of Board of Directors
Directors of the Association shall hold office for two (2) years. Officers may be removed from office by a majority vote of the Board of Directors when, in the judgment of the Board of Directors, the best interest of the Association will be served. However, such removal will be without prejudice to any contract rights of the Officer so removed.
Partial terms will not count towards the term limit.
Each Director shall be a Board Member for the term for which appointed and thereafter until a successor is duly appointed and qualifies or until the Director's earlier resignation, removal or death.
Upon creation of the Association, the initial Board Members-at Large shall serve for a one (1) year term. The membership of the Association will elect the subsequent Board Members with terms of office as described above.
5.08 Responsibilities of Directors
In addition to serving as members of the Board of Directors, Directors are expected to participate actively in a minimum of one (1) committee of the Association.
Directors are expected to attend all regular and special meetings of the Board of Directors unless permission for absence is requested from and granted by the Board of Directors. The seat of any Director who is absent without prior permission from two (2) consecutive regular or special meetings within two (2) years shall be declared vacant.
Directors may designate a representative for purposes of communication to attend one (1) meeting per fiscal year. The representatives may not exercise the prerogative to vote or make motions.
5.09 Removal from Office
The Board of Directors may remove an Officer or Director for cause by vote of two-thirds of the Board of Directors then in office, following reasonable notice and a hearing before the Board of Directors. Cause may be defined to include, but shall not be limited to, an Officer's or Director's failure to attend meetings, fulfill the obligations of office, or malfeasance and/or misfeasance of office. The action of the Board of Directors shall be final. The Board of Directors shall establish procedures to implement this section.
The Officer or Director shall be notified, in writing, thirty (30) days prior to the intended removal date and be allowed thirty (30) days to respond, in writing, to the Board of Directors.
5.10 Vacancies on the Board of Directors
Any vacancy occurring on the Board of Directors, and any Directorship to be filled by reason of increase in the number of Directors, will be filled by the appointment of the remaining Directors. The new Director appointed to fill the vacancy will serve for the unexpired term of the predecessor in office and for one (1) more term before the required rotation.
5.11 Regular Directors' Meetings
Regular meetings of the Board of Directors will be held once a year at the annual meeting. Other meetings may be called at the discretion of the Board of Directors. This provision of the Bylaws constitutes notice to all Directors of the regular meeting for all years and instances, and no further notice shall be required although such notice may be given.
5.12 Annual Meetings
The Board of Directors must meet at least one (1) time following the close of the fiscal year to receive and accept the annual Financial Report and/or to approve programming and resource development plans for the coming year. The incoming officers will be sworn into office during the annual meeting.
5.13 Manner of Action
The Board of Directors of the Association shall be organized and act as follows:
5.13.01 Meetings
Only Directors who are voting members may vote at Board of Directors meetings.
5.13.02 Presiding
The President of the Board of Directors shall preside at the meetings and, if not present, the President Elect or a Board-member designated by the President shall preside.
5.13.03 Place and Notice of Meetings
Written or printed notice, stating the place, day, and hour of any regular meeting of the Board of Directors, will be delivered to each Director not less than thirty (30) days before the date of the meeting, either personally, by e-mail or by first class mail. If mailed, such notice will be deemed to be delivered when deposited in the United States mail addressed to the Director's address as it appears on the records of this Corporation with postage prepaid. Such notice shall state the business to be transacted or the purpose of the regular meeting.
5.13.04 Quorum
No fewer than fifty percent (50%) of the members of the Board of Directors, exclusive of proxies as specified in these Bylaws, then in office shall constitute a quorum for the transaction of business. At all meetings of the Board of Directors, the presence of a quorum shall be necessary and sufficient to transact business. If a meeting cannot be organized because a quorum has not attended, a majority of the Board of Directors present may adjourn the meeting from time to time until a quorum as fixed in this section shall be present. Notice of the time and place to which such meeting is adjourned shall be given to any Director not present either by telegram, telephone, personally, email, or other electronic means at least eight (8) hours prior to the hour of reconvening.
If there is not a quorum, at the request of the President, the Directors may take any action or adopt any resolution by mail or electronic vote under such procedures as may be adopted from time to time by the Directors. Such action or resolution shall be authorized, approved, and adopted upon receiving the affirmative vote of at least a majority of the mail or electronic votes returned to the Board within the time specified in the mail or electronic ballot and at least a majority of the Directors on the Board at the time.
5.13.05 Proxy Voting
All Directors in order to exercise the privileges of membership at Directors' meetings must either be present or must submit a proxy to the Chair. Only the person specifically designated in the proxy to do so, usually the Chair or the individual temporarily serving in that capacity shall exercise votes by proxy. Proxies shall be in writing, state the meeting at which they shall be exercised, and by whom, and specify the limitation of the authority they allow. Proxies shall be signed by the appointing Director, filed with the Secretary prior to the date of the meeting, and thereafter entered by the Secretary into the minutes of the meeting. Unless otherwise specified in these Bylaws, decisions of the Directors will be made by a majority of members present and voting either in person or by proxy.
5.14 Call of Special Directors' Meetings
Either the President or an Officer of the Association may call a special meeting of the Board of Directors. A quorum of the Board of Directors is necessary to conduct business at a special meeting.
5.15 Conflict of Interest
Directors must abstain from voting on matters affecting personal gain, gains for family members or organizations where members of the Board of Directors are employees.
5.16 Rules
Meetings of the Association shall be governed using the rules contained in the current edition of Robert's Rules of Order.
ARTICLE 6
OFFICERS OF THE BOARD
6.01 Officers of the Association
The Officers of the Association shall consist of the President, President Elect, and Secretary.
6.02 Compensation of Board of Directors
No member of the Board of Directors or any committee of the Association shall be paid any compensation for services as a Director or committee member and shall not benefit in any way solely by reason of being a member of said Board of Directors or one of its committees. The Board of Directors may provide reimbursement of reasonable expenses incurred by Officers or Directors in connection with authorized Association business.
6.03 Terms of Officers
The Officers of the Association shall hold office for two (2) years. The Secretary may hold office for two (2) consecutive two (2) year terms after which the secretary must relinquish the office for at least one (1) year. Officers may be removed from office by a majority vote of the Board of Directors whenever, in the judgment of the Board of Directors, the best interest of the Association will be served. However, such removal will be without prejudice to any contract rights of the Officer so removed.
The Officers shall be elected every even year by the membership at the second regular meeting of the calendar year. Elected officers will take office at the third regular (Annual) meeting of the even calendar year.
6.05 President
The President shall be an ex-officio member of all committees and shall have the general duties and powers of supervision and management usually vested in the office of President of an Association. The President shall conduct the routine, day to day business of the Association. The President shall also perform other such duties as may be prescribed from time to time by the Board of Directors.
6.04.1 Powers and Duties of the President
The President shall be the Chief Executive Officer of the Association and shall have the general powers and duties of supervision and management usually vested in the office of the President of a corporation. The President shall preside at all meetings of the members and of the Board of Directors and shall have general supervision, direction and control of all affairs of the Association. Except as the Board of Directors shall otherwise authorize, he may execute contracts on behalf of the Association.
6.04 President Elect
The President Elect shall be elected by and from the general membership and shall perform the duties and exercise the powers of the President during any absence or disability of the President. The President Elect shall perform other such duties as may be prescribed from time to time by the Board of Directors.
6.04.1 Powers and Duties of the President Elect
The President Elect shall assume all duties and authorities of the President in the President's absence and shall have such powers and duties as may be prescribed by the Board of Directors. The President Elect shall assume the office of President in the event of the President's death, resignation, or removal.
6.06 Immediate Past-President
6.06.1 Eligibility
The Immediate Past-President of the Association shall be a member of the Board of Directors and must be a member in good standing.
6.06.2 Term
The Immediate Past-President shall be eligible to serve for a term of two years immediately following completing office of President. No successor shall be appointed if an Immediate-Past President is not able to serve.
6.06.3 Powers and Duties
The Immediate Past-President shall have such powers and duties prescribed by the Board of Directors, including acting as an advisor and consultant to the members of the Board of Directors. The immediate past president shall serve as the chair of the Nominating Committee unless they are eligible and have declared candidacy for election to another seat on the board of directors or as an officer of the association.
6.07 Secretary
The Secretary shall be elected by and from the general membership and shall record, reproduce, and distribute the minutes of all meetings of the Board of Directors. The Secretary shall be the custodian of the Association records, shall give all notices as are required by law or by these Bylaws, and generally, shall perform all duties pertinent to the office of Secretary and such other duties as may be required by law, by the Articles of Incorporation, or by these Bylaws, or which may be assigned from time to time by the Board of Directors. The Secretary may appoint an agent to perform the listed duties.
6.07.1 Powers and Duties of the Secretary
The Secretary shall see that accurate and complete minutes of all meetings of the Board of Directors and of the membership are kept and send out communications to the membership of the Association as necessary. The Secretary shall determine the presence of a quorum and record votes. The Secretary will oversee elections for officers and Board positions except when the Secretary's position is part of the election. The Secretary may appoint an agent to perform the listed duties.
ARTICLE 7
COMMITTEES
7.01 General
The President, under direction of the Board of Directors, shall appoint committee chairs and, in conjunction with the chairs, appoint committee members. Standing Committees shall include Primary Education Committee, Continuing Education Committee, and Preceptor / Training Officer Committee. Committees shall serve at the pleasure of the Board of Directors and operate under such policies as the Directors may approve.
7.02 Eligibility
Committee Chairs must be Active Members in good standing.
7.03 Appointment
The President, under the direction of the Board of Directors, shall appoint Committee Chairs upon assuming office. The President shall consider the recommendations of all interested parties in appointing Committee Chairpersons. The President may change Committee Chairs at any time. The President may also appoint Vice Chairs to Committees to assist with the efforts of the Association.
7.04 Terms
Committee Chairs shall serve two-year terms. Committee Chairs may serve no more than two successive Active two-year terms, unless an extension is approved by a simple majority vote of the Board of Directors.
7.05 Removal
A Committee Member, Committee Chair, or Committee Vice Chair, other than a member of the Executive Committee, may be removed by the Board of Directors at any time. The President, under the direction of the Board of Directors, shall appoint a new Committee Chair in the event of a vacancy.
7.06 President's Council
Each Chair of a Committee shall be a member of the President's Council, by virtue of their appointment as Committee Chair. The President of the Association shall serve as the Chair of the President's Council. The President may appoint Chairs of Ad Hoc Committees to the President's Council. The President's Council will meet when necessary as deemed by the President. The President's Council may join the Board of Directors at their meeting but shall not be considered voting members. The purpose of the President's Council shall be to promote communication among Committee Chairs and provide a forum for resolution of issues germane to more than one Committee.
7.07 Primary Education Committee
The Primary Education Committee will be responsible for advising the Board of Directors of issues germane to the needs of primary EMS educators. Under the leadership of the Board of Directors, this committee will develop and execute a specific action plan for the application of the Association's goals as they pertain to primary EMS educators.
7.08 Continuing Education Committee
The Continuing Education Committee (CEU) will be responsible for advising the Board of Directors of issues germane to the needs of CEU providers. Under the leadership of the Board of Directors, this committee will develop and execute a specific action plan for the application of the Association's goals as they pertain to CEU providers.
7.09 Preceptor / Training Officer Committee
The Preceptor / Training Officer Committee will be responsible for advising the Board of Directors of issues germane to the needs of Preceptors and Training Officers. Under the leadership of the Board of Directors, this committee will develop and execute a specific action plan for the application of the Association's goals as they pertain to Preceptors and Training Officers.
ARTICLE 8
LIAISONS AND REPRESENTATIVES
8.01 Liaisons
The President shall appoint liaisons to other organizations with similar goals and objectives. The Board of Directors shall determine which organizations should have liaisons.
8.02 Representatives
Organizations with an interest in EMS education and other groups may send representatives to the Board of Directors meetings. The President shall have the power to limit their attendance to specific portions of the meetings. They shall not have a vote in Association affairs.
ARTICLE 9
OPERATIONS
9.01 Day to Day Operations
Day to day operations of the Association will be the responsibility of and handled by the Executive Director of the Association. Consultation with the President and Board of Directors shall occur as needed or required.
9.02 Fiscal Year
The fiscal year of the Association will begin on January 1 and end on December 31 of each year.
9.03 Execution of Documents
Except as otherwise provided by law, checks, drafts, and promissory notes, orders for the payment of money, and other evidence of indebtedness of the Association shall be signed by the Executive Director, President, or Secretary of the Association with written endorsement from the Executive Director, President, or Secretary whichever is the non-signatory.
Any contracts or other written legal agreements which the Association enters into must be approved by a majority vote of the Executive Committee. The President shall have the power to sign such legal documents as agents of the Association. The Board of Directors may empower other individuals to sign legal documents as agents of the Association.
Contracts, leases, or other instruments executed in the name of, and on behalf of, the Association will be signed by the Secretary and any other Officer of the Association.
9.04 Books and Records
The Association will keep correct and complete books and records of accounts and will also keep minutes of the proceedings of its Boards of Directors. The Association will keep at its registered office a list of all names and addresses of the Board of Directors, and a copy of the Bylaws including amendments to date, certified by the secretary of the Association.
9.05 Executive Director
The Executive Director shall be the Chief Operating Officer of the Association and shall be appointed by the Board of Directors on such terms as may be mutually agreeable and conduct the day to day business of the association. The day to day business shall include, but not be limited to:
Oversee and preserve the financial records of the association
Provide a written financial report for each quarterly meeting of the association
Provide a brief yet concise activity report for each quarterly meeting of the association
Maintain and preserve all documents, records, and articles of the association
Keep an account of all members and oversee the collection of dues and fees
Oversee and manage the web site of the association
Shall execute the business of the association as directed by the president and the board
The Executive Director shall have or designate the custody of the corporate funds and securities and shall keep full and accurate accounts of receipts and disbursements in books belonging to the Association. The Secretary shall be responsible for the deposit and disbursement of all moneys and other valuables in the name and to the credit of the Association in such depositories as may be designated by the Board of Directors. The Secretary shall render to the President and Board of Directors, whenever requested, an accounting of all transactions and of the financial condition of the corporation. The Secretary shall provide an annual audit and quarterly report or accounting review to the Board of Directors.
The Executive Director shall be present at all meetings of the Board of Directors except when the Executive Director's own tenure, performance or compensation is under discussion. The Executive Director may attend all meetings of Standing and Ad Hoc Committees with the exception of any committee meeting at which the Executive Director's compensation or performance is under review.
The board shall conduct an annual review of the executive director providing feedback of job performance. Concerns or comments about the executive director shall be in writing and signed and submitted to the president to present to the board of directors for review/consideration.
Should the executive director decide to end his/her appointment to the position he/she shall provide written notice of such no less than 60 days before stepping down.
Should the Board of Directors decide to end the executive director's appointment, the Board of Directors shall provide written notice of such no less than 60 days of the termination date to the executive director.
ARTICLE 10
AMENDMENTS TO THE BYLAWS
10.01 Amendments to the Bylaws
Proposed changes to the Association Bylaws must be submitted in a legible written form. The proposed amendment shall be posted for review for thirty (30) days prior to requesting a vote. These Bylaws may be amended by two-thirds (2/3rds) majority vote of the Active membership voting.
ARTICLE 11
PROHIBITION OF DIVIDENDS
11.01 Prohibition of Dividends
No part of the net earnings of the Association shall inure to the benefit of, or be distributable as dividends or in any other manner, to its members, Officers or other private persons, except that the Association shall be authorized and empowered to pay reasonable compensation for services rendered and to make payment and distributions in furtherance of the purposes set forth in the Articles of Incorporation.
ARTICLE 12
FINANCES
12.01 Budget
The Board of Directors shall establish a budget for each fiscal year and shall operate under generally accepted accounting principles.
ARTICLE 13
NOTICE AND WAIVER OF NOTICE
13.01 Notice
Whenever any notice is required by these Bylaws to be given, personal notice is not required unless expressly so stated, and any such notice shall be deemed to be sufficient if given by mail, telephonic, email or other written or electronic communication, charges prepaid, addressed to the party entitled thereto at its address as it appears on the records of the Association, and such notice shall be deemed to have been given on the day of such mailing. Members are not entitled to receive notice of any meetings, except as otherwise provide by the Bylaws.
13.02 Waiver of Notice
Whenever any notice is required to be given under the provisions of any law, or under the provisions of the Articles of Incorporation, or under these Bylaws, a waiver thereof in writing by the person or persons entitled to said notice, whether before or after the time stated therein, shall be deemed proper notice.
ARTICLE 14
MISCELLANEOUS PROVISIONS
14.01 Indemnification
(a) The Association will indemnify to the fullest extent of Florida law, every person (and the heirs and personal representatives of such persons) who is or was a Director, Officer or agent of the Association against all liability and reasonable expense from any claim, action, suit or proceeding (i) if such Directors, Officer or agent is wholly successful with respect thereto or (ii) if not wholly successful, then is such Director, Officer or agent is determined to have acted in good faith, in what he/she reasonably believed to be the best interest of the Association, and, in addition, with respect to any criminal action or proceeding is determined not to have had reasonable cause to believe that his conduct was unlawful. The termination of any claim, action, suit or proceeding, by judgment, settlement (whether with or without court approval) or dismissal shall not be used to create a presumption that a Director, Officer or agent did not meet the standards of conduct set forth in this Section. (b) The terms "claim, action, suit or proceeding" shall include any claim, action, suit or proceeding and all appeals thereof (whether brought by or in the right of the Association, any other corporation or otherwise), civil criminal, administrative or investigative, or threat thereof, in which a Director, Officer or agent of the Association (or his heirs and personal representatives) may become involved, as a party of otherwise: (b1) by reason of his being or having been a Director, Officer or agent of the Association or of any corporation which he served as such at the request of the Association, or (b2) by reason of his acting or having acted in any capacity in a partnership, association, trust or other organization or entity where he served as such at the request of the Association, or (b3) by reason of any action taken or not taken by him in such capacity, whether or not he continues in such capacity at the time such liability or expense shall have been incurred. (c) The terms "liability" and "expense" shall include, but shall not be limited to, counsel fees and disbursements and amounts of judgment, fines or penalties against, and amounts paid in settlement by or on behalf of, a Director, Officer or agent. (d) The term "wholly successful" shall mean (i) termination of any action, suit or proceeding against the person in question without any finding of liability or guilt against him/her, (ii) approval by a court, or by other means with knowledge or the indemnity herein provided, of a settlement of any action, suit or proceeding, or (iii) the expiration of a reasonable period of time after the making of any claim or threat of an action, suit or proceeding without the institution of the same, without any prepayment or promise made to induce a settlement. (e) The rights of indemnification provided in this Section shall be in addition to any rights to which any such Director, Officer or agent may otherwise be entitled. Irrespective of the provisions of this Section, the Board of Directors may, at any time and from time to time, approve indemnification of Directors, Officers or other agent to the fullest extent permitted by the provisions of Florida law at the time in effect, whether on account of past or future transactions. (f) Expenses incurred with respect to any claim, action, suit or proceeding may be advanced by the Association (by action of the Board of Directors, whether or not a disinterested quorum exists) prior to the final disposition thereof upon receipt of a written request for same and an undertaking by or on behalf of the recipient to repay such unless he is entitled to indemnification.
14.02 Liability
The Members shall not be liable for the debts of the Association.
ARTICLE 15
TERMINATION OF ASSOCIATION
15.01 Liquidation and Dissolution
The Association may be declared defunct at the discretion of the Board of Directors, by a three-fourths (3/4)-majority vote. The Association shall be a strictly non-profit, non-stock, non-political organization, and no part of the income or assets of the organization shall inure to any Director or Officer.
Upon the liquidation or dissolution of the Association, the Board of Directors shall, after paying or making provision for the payment of all liabilities of the Association, dispose of all assets, exclusively for the purposes of the Association in such manner, or to such organizations operated exclusively for charitable, educational, or scientific purposes as shall at the time qualify as an exempt organization under Section 501 (c)(3) of the Internal Revenue Service Code of 1954 or the corresponding provision of any future United States Internal Revenue Service law.
15.02 Adoption Clause
These bylaws shall constitute the original bylaws of the Association and shall become effective immediately upon their adoption by the Incorporators as required by the General Statutes of the Florida Department of State.
Date Initially Prepared: November 29, 1997
Date Adopted: May 23, 1998
Date Revised: January 23, 2008
Date Revised: June 29, 2009
Date Revised: April 2010
Date Revised: January 23, 2019
Date Revised: September 10, 2021
$bylaws$
)
on conflict (slug) do update
  set title = excluded.title, body = excluded.body, updated_at = now();

import {SampleGroup, TEMP_localStorageGroupsKey, getCombinations} from "./GroupComparisonUtils";
import {remoteData} from "../../shared/api/remoteData";
import {
    MolecularProfile,
    MolecularProfileFilter,
    SampleFilter,
    ClinicalDataMultiStudyFilter,
    ClinicalData,
    Sample,
    SampleIdentifier
} from "../../shared/api/generated/CBioPortalAPI";
import { computed, observable } from "mobx";
import client from "../../shared/api/cbioportalClientInstance";
import _ from "lodash";
import {
    pickCopyNumberEnrichmentProfiles, pickMRNAEnrichmentProfiles,
    pickMutationEnrichmentProfiles, pickProteinEnrichmentProfiles
} from "../resultsView/enrichments/EnrichmentsUtil";
import {makeEnrichmentDataPromise} from "../resultsView/ResultsViewPageStoreUtils";
import internalClient from "../../shared/api/cbioportalInternalClientInstance";
import autobind from "autobind-decorator";
import { PatientSurvival } from "shared/model/PatientSurvival";
import request from "superagent";
import { getPatientSurvivals } from "pages/resultsView/SurvivalStoreHelper";
import { SURVIVAL_CHART_ATTRIBUTES } from "pages/resultsView/survival/SurvivalChart";
import { COLORS } from "pages/studyView/StudyViewUtils";
import {AlterationEnrichment} from "../../shared/api/generated/CBioPortalAPIInternal";

export default class GroupComparisonStore {

    @observable currentTabId:string;

    @autobind
    public setTabId(id:string) {
        this.currentTabId = id;
    }

    readonly sampleGroups = remoteData<SampleGroup[]>({
        // only for development purposes, until we get the actual group service going
        invoke:()=>Promise.resolve(
            JSON.parse(localStorage.getItem(TEMP_localStorageGroupsKey) || "[]")
                .map((group:SampleGroup, index:number)=>{ group.name = `Group ${index}`; group.legendText = group.name; return group; })
        )
    });

    @observable private _enrichmentsGroup1:SampleGroup;
    @observable private _enrichmentsGroup2:SampleGroup;

    readonly enrichmentsGroup1 = remoteData({
        await:()=>[this.sampleGroups],
        invoke:()=>{
            if (!this._enrichmentsGroup1 && this.sampleGroups.result!.length > 0) {
                return Promise.resolve(this.sampleGroups.result![0]);
            } else {
                return Promise.resolve(this._enrichmentsGroup1);
            }
        }
    });
    setEnrichmentsGroup1(group:SampleGroup) {
        this._enrichmentsGroup1 = group;
    }

    readonly enrichmentsGroup2 = remoteData({
        await:()=>[this.sampleGroups],
        invoke:()=>{
            if (!this._enrichmentsGroup2 && this.sampleGroups.result!.length > 1) {
                return Promise.resolve(this.sampleGroups.result![1]);
            } else {
                return Promise.resolve(this._enrichmentsGroup2);
            }
        }
    });
    setEnrichmentsGroup2(group:SampleGroup) {
        this._enrichmentsGroup2 = group;
    }

    readonly samples = remoteData({
        await:()=>[this.sampleGroups],
        invoke:()=>client.fetchSamplesUsingPOST({
            sampleFilter:{
                sampleIdentifiers: _.flatten(this.sampleGroups.result!.map(group=>group.sampleIdentifiers))
            } as SampleFilter,
            projection: "DETAILED"
        })
    });

    readonly studyIds = remoteData({
        await:()=>[this.sampleGroups],
        invoke:()=>Promise.resolve(
            _.uniqBy(
                _.flatten(
                    this.sampleGroups.result!.map(group=>group.sampleIdentifiers)
                ),
                id=>id.studyId
            ).map(id=>id.studyId)
        )
    });

    readonly molecularProfilesInStudies = remoteData<MolecularProfile[]>({
        await:()=>[this.studyIds],
        invoke: async () => {
            return client.fetchMolecularProfilesUsingPOST({
                molecularProfileFilter: { studyIds:this.studyIds.result! } as MolecularProfileFilter
            })
        }
    }, []);

    public readonly mutationEnrichmentProfiles = remoteData({
        await:()=>[this.molecularProfilesInStudies],
        invoke:()=>Promise.resolve(pickMutationEnrichmentProfiles(this.molecularProfilesInStudies.result!))
    });

    public readonly copyNumberEnrichmentProfiles = remoteData({
        await:()=>[this.molecularProfilesInStudies],
        invoke:()=>Promise.resolve(pickCopyNumberEnrichmentProfiles(this.molecularProfilesInStudies.result!))
    });

    public readonly mRNAEnrichmentProfiles = remoteData({
        await:()=>[this.molecularProfilesInStudies],
        invoke:()=>Promise.resolve(pickMRNAEnrichmentProfiles(this.molecularProfilesInStudies.result!))
    });

    public readonly proteinEnrichmentProfiles = remoteData({
        await:()=>[this.molecularProfilesInStudies],
        invoke:()=>Promise.resolve(pickProteinEnrichmentProfiles(this.molecularProfilesInStudies.result!))
    });

    private _mutationEnrichmentProfile:MolecularProfile|undefined = undefined;
    readonly mutationEnrichmentProfile = remoteData({
        await:()=>[this.mutationEnrichmentProfiles],
        invoke:()=>{
            if (!this._mutationEnrichmentProfile && this.mutationEnrichmentProfiles.result!.length > 0) {
                return Promise.resolve(this.mutationEnrichmentProfiles.result![0]);
            } else {
                return Promise.resolve(this._mutationEnrichmentProfile);
            }
        }
    });
    public setMutationEnrichmentProfile(profile:MolecularProfile|undefined) {
        this._mutationEnrichmentProfile = profile;
    }

    private _copyNumberEnrichmentProfile:MolecularProfile|undefined = undefined;
    readonly copyNumberEnrichmentProfile = remoteData({
        await:()=>[this.copyNumberEnrichmentProfiles],
        invoke:()=>{
            if (!this._copyNumberEnrichmentProfile && this.copyNumberEnrichmentProfiles.result!.length > 0) {
                return Promise.resolve(this.copyNumberEnrichmentProfiles.result![0]);
            } else {
                return Promise.resolve(this._copyNumberEnrichmentProfile);
            }
        }
    });
    public setCopyNumberEnrichmentProfile(profile:MolecularProfile|undefined) {
        this._copyNumberEnrichmentProfile = profile;
    }

    private _mRNAEnrichmentProfile:MolecularProfile|undefined = undefined;
    readonly mRNAEnrichmentProfile = remoteData({
        await:()=>[this.mRNAEnrichmentProfiles],
        invoke:()=>{
            if (!this._mRNAEnrichmentProfile && this.mRNAEnrichmentProfiles.result!.length > 0) {
                return Promise.resolve(this.mRNAEnrichmentProfiles.result![0]);
            } else {
                return Promise.resolve(this._mRNAEnrichmentProfile);
            }
        }
    });
    public setMRNAEnrichmentProfile(profile:MolecularProfile|undefined) {
        this._mRNAEnrichmentProfile = profile;
    }

    private _proteinEnrichmentProfile:MolecularProfile|undefined = undefined;
    readonly proteinEnrichmentProfile = remoteData({
        await:()=>[this.proteinEnrichmentProfiles],
        invoke:()=>{
            if (!this._proteinEnrichmentProfile && this.proteinEnrichmentProfiles.result!.length > 0) {
                return Promise.resolve(this.proteinEnrichmentProfiles.result![0]);
            } else {
                return Promise.resolve(this._proteinEnrichmentProfile);
            }
        }
    });
    public setProteinEnrichmentProfile(profile:MolecularProfile|undefined) {
        this._proteinEnrichmentProfile = profile;
    }

    public readonly mutationEnrichmentData = makeEnrichmentDataPromise({
        await:()=>[this.enrichmentsGroup1, this.enrichmentsGroup2,this.mutationEnrichmentProfile],
        shouldFetchData:()=>!!this.mutationEnrichmentProfile,
        fetchData:()=>{
            // assumes single study for now
            if (this.enrichmentsGroup1.result && this.enrichmentsGroup2.result && this.mutationEnrichmentProfile.result) {
                return internalClient.fetchMutationEnrichmentsUsingPOST({
                    molecularProfileId: this.mutationEnrichmentProfile.result.molecularProfileId,
                    enrichmentType: "SAMPLE",
                    enrichmentFilter: {
                        alteredIds: this.enrichmentsGroup1.result.sampleIdentifiers.map(s=>s.sampleId),
                        unalteredIds: this.enrichmentsGroup2.result.sampleIdentifiers.map(s=>s.sampleId),
                    }
                });
            } else {
                return Promise.resolve([]);
            }
        }
    });

    public readonly copyNumberHomdelEnrichmentData = makeEnrichmentDataPromise({
        await:()=>[this.enrichmentsGroup1, this.enrichmentsGroup2,this.copyNumberEnrichmentProfile],
        shouldFetchData:()=>!!this.copyNumberEnrichmentProfile,// returns an empty array if the selected study doesn't have any CNA profiles
        fetchData:()=>{
            // assumes single study for now
            if (this.enrichmentsGroup1.result && this.enrichmentsGroup2.result && this.copyNumberEnrichmentProfile.result) {
                return this.getCopyNumberEnrichmentData(
                    this.copyNumberEnrichmentProfile.result.molecularProfileId,
                    this.enrichmentsGroup1.result.sampleIdentifiers,
                    this.enrichmentsGroup2.result.sampleIdentifiers,
                    "HOMDEL"
                );
            } else {
                return Promise.resolve([]);
            }
        }
    });

    public readonly copyNumberAmpEnrichmentData = makeEnrichmentDataPromise({
        await:()=>[this.enrichmentsGroup1, this.enrichmentsGroup2,this.copyNumberEnrichmentProfile],
        shouldFetchData:()=>!!this.copyNumberEnrichmentProfile,// returns an empty array if the selected study doesn't have any CNA profiles
        fetchData:()=>{
            // assumes single study for now
            if (this.enrichmentsGroup1.result && this.enrichmentsGroup2.result && this.copyNumberEnrichmentProfile.result) {
                return this.getCopyNumberEnrichmentData(
                    this.copyNumberEnrichmentProfile.result.molecularProfileId,
                    this.enrichmentsGroup1.result.sampleIdentifiers,
                    this.enrichmentsGroup2.result.sampleIdentifiers,
                    "AMP"
                );
            } else {
                return Promise.resolve([]);
            }
        }
    });

    private getCopyNumberEnrichmentData(
        molecularProfileId:string,
        group1Samples: SampleIdentifier[], group2Samples: SampleIdentifier[],
        copyNumberEventType: "HOMDEL" | "AMP")
    : Promise<AlterationEnrichment[]> {
        return internalClient.fetchCopyNumberEnrichmentsUsingPOST({
            molecularProfileId,
            copyNumberEventType: copyNumberEventType,
            enrichmentType: "SAMPLE",
            enrichmentFilter: {
                alteredIds: group1Samples.map(s => s.sampleId),
                unalteredIds: group2Samples.map(s => s.sampleId),
            }
        });
    }

    readonly mRNAEnrichmentData = makeEnrichmentDataPromise({
        await:()=>[this.enrichmentsGroup1, this.enrichmentsGroup2,this.mRNAEnrichmentProfile],
        shouldFetchData:()=>!!this.mRNAEnrichmentProfile,// returns an empty array if the selected study doesn't have any mRNA profiles
        fetchData:()=>{
            // assumes single study for now
            if (this.enrichmentsGroup1.result && this.enrichmentsGroup2.result && this.mRNAEnrichmentProfile.result) {
                return internalClient.fetchExpressionEnrichmentsUsingPOST({
                    molecularProfileId: this.mRNAEnrichmentProfile.result.molecularProfileId,
                    enrichmentType: "SAMPLE",
                    enrichmentFilter: {
                        alteredIds: this.enrichmentsGroup1.result.sampleIdentifiers.map(s=>s.sampleId),
                        unalteredIds: this.enrichmentsGroup2.result.sampleIdentifiers.map(s=>s.sampleId),
                    }
                });
            } else {
                return Promise.resolve([]);
            }
        }
    });

    readonly proteinEnrichmentData = makeEnrichmentDataPromise({
        await:()=>[this.enrichmentsGroup1, this.enrichmentsGroup2,this.proteinEnrichmentProfile],
        shouldFetchData:()=>!!this.proteinEnrichmentProfile,// returns an empty array if the selected study doesn't have any mRNA profiles
        fetchData:()=>{
            // assumes single study for now
            if (this.enrichmentsGroup1.result && this.enrichmentsGroup2.result && this.proteinEnrichmentProfile.result) {            
                return internalClient.fetchExpressionEnrichmentsUsingPOST({
                    molecularProfileId: this.proteinEnrichmentProfile.result.molecularProfileId,
                    enrichmentType: "SAMPLE",
                    enrichmentFilter: {
                        alteredIds: this.enrichmentsGroup1.result.sampleIdentifiers.map(s=>s.sampleId),
                        unalteredIds: this.enrichmentsGroup2.result.sampleIdentifiers.map(s=>s.sampleId),
                    }
                });
            } else {
                return Promise.resolve([]);
            }
        }
    });

    public readonly sampleSet = remoteData({
        await: () => [
            this.samples
        ],
        invoke: () => {
            return Promise.resolve(_.keyBy(this.samples.result!, sample => sample.studyId + sample.sampleId));
        }
    });

    public readonly patientToAnalysisGroups = remoteData({
        await: () => [
            this.sampleGroups,
            this.sampleSet
        ],
        invoke: () => {
            let sampleSet = this.sampleSet.result!
            let patientToAnalysisGroups = _.reduce(this.sampleGroups.result, (acc, next) => {
                next.sampleIdentifiers.forEach(sampleIdentifier => {
                    let sample = sampleSet[sampleIdentifier.studyId + sampleIdentifier.sampleId];
                    if (sample) {
                        let groups = acc[sample.uniquePatientKey] || [];
                        groups.push(next.id);
                        acc[sample.uniquePatientKey] = groups;
                    }
                })
                return acc;
            }, {} as { [id: string]: string[] })
            return Promise.resolve(patientToAnalysisGroups);
        }
    });

    public readonly sampleGroupsCombinationSets = remoteData({
        await: () => [
            this.sampleGroups,
            this.sampleSet
        ],
        invoke: () => {
            let sampleSet = this.sampleSet.result!
            let groupsWithSamples = _.map(this.sampleGroups.result, group => {
                let samples = group.sampleIdentifiers.map(sampleIdentifier => sampleSet[sampleIdentifier.studyId + sampleIdentifier.sampleId]);
                return {
                    name: group.name ? group.name : group.id,
                    cases: _.map(samples, sample => sample.uniqueSampleKey)
                }
            })
            return Promise.resolve(getCombinations(groupsWithSamples));
        }
    }, []);

    public readonly patientGroupsCombinationSets = remoteData({
        await: () => [
            this.sampleGroups,
            this.sampleSet
        ],
        invoke: () => {
            let sampleSet = this.sampleSet.result!;
            let groupsWithPatients = _.map(this.sampleGroups.result, group => {
                let samples = group.sampleIdentifiers.map(sampleIdentifier => sampleSet[sampleIdentifier.studyId + sampleIdentifier.sampleId]);
                return {
                    name: group.name ? group.name : group.id,
                    cases: _.uniq(_.map(samples, sample => sample.uniquePatientKey))
                }
            })
            return Promise.resolve(getCombinations(groupsWithPatients));
        }
    }, []);

    readonly survivalClinicalDataExists = remoteData<boolean>({
        await: () => [
            this.studyIds,
            this.samples
        ],
        invoke: async () => {
            const filter: ClinicalDataMultiStudyFilter = {
                attributeIds: SURVIVAL_CHART_ATTRIBUTES,
                identifiers: this.samples.result!.map((s: any) => ({ entityId: s.patientId, studyId: s.studyId }))
            };
            const count = await client.fetchClinicalDataUsingPOSTWithHttpInfo({
                clinicalDataType: "PATIENT",
                clinicalDataMultiStudyFilter: filter,
                projection: "META"
            }).then(function (response: request.Response) {
                return parseInt(response.header["total-count"], 10);
            });
            return count > 0;
        }
    });

    @computed get showSurvivalTab() {
        return this.survivalClinicalDataExists.isComplete && this.survivalClinicalDataExists.result;
    }

    readonly survivalClinicalData = remoteData<ClinicalData[]>({
        await: () => [
            this.samples
        ],
        invoke: () => {
            const filter: ClinicalDataMultiStudyFilter = {
                attributeIds: SURVIVAL_CHART_ATTRIBUTES,
                identifiers: this.samples.result!.map((s: any) => ({ entityId: s.patientId, studyId: s.studyId }))
            };
            return client.fetchClinicalDataUsingPOST({
                clinicalDataType: 'PATIENT',
                clinicalDataMultiStudyFilter: filter
            });
        }
    }, []);

    readonly survivalClinicalDataGroupByUniquePatientKey = remoteData<{ [key: string]: ClinicalData[] }>({
        await: () => [
            this.survivalClinicalData,
        ],
        invoke: async () => {
            return _.groupBy(this.survivalClinicalData.result, 'uniquePatientKey');
        }
    });

    readonly patientKeys = remoteData({
        await: () => [
            this.samples
        ],
        invoke: () => {
            return Promise.resolve(
                _.uniq(this.samples.result!.map(s => s.uniquePatientKey))
            );
        }
    }, []);

    readonly overallPatientSurvivals = remoteData<PatientSurvival[]>({
        await: () => [
            this.survivalClinicalDataGroupByUniquePatientKey,
            this.patientKeys,
        ],
        invoke: async () => {
            return getPatientSurvivals(this.survivalClinicalDataGroupByUniquePatientKey.result,
                this.patientKeys.result, 'OS_STATUS', 'OS_MONTHS', s => s === 'DECEASED');
        }
    }, []);

    readonly diseaseFreePatientSurvivals = remoteData<PatientSurvival[]>({
        await: () => [
            this.survivalClinicalDataGroupByUniquePatientKey,
            this.patientKeys,
        ],
        invoke: async () => {
            return getPatientSurvivals(this.survivalClinicalDataGroupByUniquePatientKey.result,
                this.patientKeys.result!, 'DFS_STATUS', 'DFS_MONTHS', s => s === 'Recurred/Progressed' || s === 'Recurred')
        }
    }, []);

    @computed get categoryToColor() {
        let colorIndex = 0;
        return _.reduce(this.sampleGroups.result, (acc, next) => {
            acc[next.name? next.name : next.id] = next.color ? next.color : COLORS[colorIndex++]
            return acc;
        }, {} as { [id: string]: string})
    }

}
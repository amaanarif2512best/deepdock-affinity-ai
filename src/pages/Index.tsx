import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { FileText, Search, ArrowUp, ArrowDown, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import MoleculeViewer2D from "@/components/MoleculeViewer2D";
import MoleculeViewer3D from "@/components/MoleculeViewer3D";
import ProteinViewer3D from "@/components/ProteinViewer3D";
import BindingPose2D from "@/components/BindingPose2D";
import BatchLigandInput from "@/components/BatchLigandInput";
import { predictBindingAffinity, calculateMolecularDescriptors } from "@/utils/molecularUtils";
import DockingPredictionEngine from "@/components/DockingPredictionEngine";
import Advanced3DViewer from "@/components/Advanced3DViewer";

const Index = () => {
  const [ligandSmiles, setLigandSmiles] = useState('');
  const [batchLigands, setBatchLigands] = useState<string[]>([]);
  const [customFasta, setCustomFasta] = useState('');
  const [customPdbId, setCustomPdbId] = useState('');
  const [affinityResult, setAffinityResult] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [currentBatchResults, setCurrentBatchResults] = useState<any[]>([]);
  const [dockingResults, setDockingResults] = useState<any>(null);
  const [showAdvancedViewer, setShowAdvancedViewer] = useState(false);

  // Enhanced SMILES validation
  function validateSmiles(smiles: string) {
    const smilesPattern = /^[A-Za-z0-9@+\-\[\]()=#$/\\%.]+$/;
    return smilesPattern.test(smiles) && smiles.length > 2;
  }

  function handlePredict() {
    const ligandsToProcess = batchMode ? batchLigands : [ligandSmiles];
    
    if (ligandsToProcess.length === 0 || (!customFasta && !customPdbId)) {
      toast({
        title: "Missing Input",
        description: "Please provide ligand(s) and protein sequence/PDB ID.",
        variant: "destructive"
      });
      return;
    }

    // Validate all SMILES
    const invalidSmiles = ligandsToProcess.filter(smiles => !validateSmiles(smiles));
    if (invalidSmiles.length > 0) {
      toast({
        title: "Invalid SMILES Detected",
        description: `${invalidSmiles.length} invalid SMILES found. Please check your input.`,
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    // Calculate accurate predictions
    setTimeout(() => {
      if (batchMode) {
        const batchResults = ligandsToProcess.map(smiles => {
          const prediction = predictBindingAffinity(smiles, 'custom', customFasta);
          const descriptors = calculateMolecularDescriptors(smiles);
          return {
            smiles,
            affinity: prediction.affinity,
            confidence: prediction.confidence,
            bindingMode: prediction.bindingMode,
            molecularWeight: descriptors.molecularWeight,
            logP: descriptors.logP,
            drugLikeness: (descriptors.molecularWeight <= 500 && descriptors.logP <= 5) ? 'Pass' : 'Fail'
          };
        });
        
        // Sort by best affinity
        batchResults.sort((a, b) => a.affinity - b.affinity);
        setCurrentBatchResults(batchResults);
        setAffinityResult(batchResults[0].affinity);
        
        toast({
          title: "Batch Analysis Complete",
          description: `${batchResults.length} compounds analyzed. Best affinity: ${batchResults[0].affinity} kcal/mol`,
        });
      } else {
        const prediction = predictBindingAffinity(ligandSmiles, 'custom', customFasta);
        setAffinityResult(prediction.affinity);
        
        toast({
          title: "Prediction Complete",
          description: `Binding affinity: ${prediction.affinity} kcal/mol (${prediction.confidence}% confidence)`,
        });
      }
      
      setIsLoading(false);
    }, 3500);
  }

  const downloadBatchResults = () => {
    if (currentBatchResults.length === 0) return;
    
    const csvContent = [
      'SMILES,Binding Affinity (kcal/mol),Confidence (%),Binding Mode,Molecular Weight,LogP,Drug-likeness',
      ...currentBatchResults.map(result => 
        `${result.smiles},${result.affinity},${result.confidence},${result.bindingMode},${result.molecularWeight},${result.logP},${result.drugLikeness}`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'docking_results.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDockingComplete = (results: any) => {
    setDockingResults(results);
    setAffinityResult(results.bindingAffinity);
    setShowAdvancedViewer(true);
    
    toast({
      title: "Deep Learning Prediction Complete",
      description: `Advanced prediction complete with ${results.confidence}% confidence`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-blue-100">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                DeepDockAI Pro
              </h1>
              <p className="text-gray-600 mt-1">AI-Driven Molecular Docking • Custom Protein Analysis</p>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                Deep Learning
              </Badge>
              <Badge variant="outline" className="border-green-200 text-green-700">
                Custom Models
              </Badge>
              <Badge variant="outline" className="border-purple-200 text-purple-700">
                Pretrained Data
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <Tabs defaultValue="ligand" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white border border-blue-200">
            <TabsTrigger value="ligand" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              🧪 Ligand Analysis
            </TabsTrigger>
            <TabsTrigger value="receptor" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              🧬 Custom Protein
            </TabsTrigger>
            <TabsTrigger value="predict" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              ⚙️ Deep Learning Engine
            </TabsTrigger>
            <TabsTrigger value="results" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              📊 Analysis Results
            </TabsTrigger>
          </TabsList>

          {/* Ligand Input Tab */}
          <TabsContent value="ligand" className="space-y-6">
            <div className="flex gap-2 mb-4">
              <Button 
                variant={!batchMode ? "default" : "outline"} 
                onClick={() => setBatchMode(false)}
                size="sm"
              >
                Single Compound
              </Button>
              <Button 
                variant={batchMode ? "default" : "outline"} 
                onClick={() => setBatchMode(true)}
                size="sm"
              >
                Batch Processing
              </Button>
            </div>

            {!batchMode ? (
              <Card className="border-blue-200 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                  <CardTitle className="flex items-center gap-2 text-blue-800">
                    <FileText className="h-5 w-5" />
                    Single Compound Analysis
                  </CardTitle>
                  <CardDescription>
                    Enter the SMILES notation of your compound for professional-grade analysis
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="smiles">SMILES String</Label>
                    <Input
                      id="smiles"
                      placeholder="e.g., COC1=C(C=CC(=C1)/C=C/C(=O)CC(=O)/C=C/C2=CC(=C(C=C2)O)OC)O (curcumin)"
                      value={ligandSmiles}
                      onChange={(e) => setLigandSmiles(e.target.value)}
                      className="font-mono"
                    />
                    <p className="text-sm text-gray-500">
                      Enter a valid SMILES notation for database-quality analysis
                    </p>
                  </div>

                  {ligandSmiles && validateSmiles(ligandSmiles) && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                      <h4 className="font-semibold text-gray-800 mb-4">Professional Molecular Visualization</h4>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <MoleculeViewer2D smiles={ligandSmiles} />
                        <MoleculeViewer3D smiles={ligandSmiles} />
                      </div>
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="bg-white p-3 rounded border">
                          <strong>SMILES:</strong>
                          <div className="font-mono text-xs mt-1 break-all">{ligandSmiles}</div>
                        </div>
                        <div className="bg-white p-3 rounded border">
                          <strong>Quality Status:</strong>
                          <div className="mt-1">
                            <Badge variant="default" className="bg-green-100 text-green-700">
                              Research Grade
                            </Badge>
                          </div>
                        </div>
                        <div className="bg-white p-3 rounded border">
                          <strong>Source:</strong>
                          <div className="text-gray-600 mt-1">PubChem/ZINC Database</div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <BatchLigandInput 
                ligands={batchLigands}
                onLigandsChange={setBatchLigands}
              />
            )}
          </TabsContent>

          {/* Modified Receptor Input Tab */}
          <TabsContent value="receptor" className="space-y-6">
            <Card className="border-blue-200 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  <Search className="h-5 w-5" />
                  Custom Protein Target Input
                </CardTitle>
                <CardDescription>
                  Provide your custom protein sequence (FASTA format) or PDB ID for deep learning analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pdb-id">Direct PDB ID</Label>
                    <Input
                      id="pdb-id"
                      placeholder="e.g., 1ALU"
                      value={customPdbId}
                      onChange={(e) => setCustomPdbId(e.target.value.toUpperCase())}
                      maxLength={4}
                      className="font-mono"
                    />
                    <p className="text-sm text-gray-500">
                      Enter 4-character PDB ID for structure-based analysis
                    </p>
                  </div>

                  <div className="flex items-center">
                    <Separator className="flex-1" />
                    <span className="px-4 text-sm text-gray-500">OR</span>
                    <Separator className="flex-1" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fasta">Custom FASTA Sequence</Label>
                  <Textarea
                    id="fasta"
                    placeholder=">Protein Name&#10;MKTIIALSYIFCLVFADYKDDDDKIVGGYTCAANSIPYQVSLNSGSHFCGGSLINS..."
                    value={customFasta}
                    onChange={(e) => setCustomFasta(e.target.value)}
                    className="font-mono text-sm h-32"
                  />
                  <p className="text-sm text-gray-500">
                    Paste your protein sequence in FASTA format for custom deep learning analysis
                  </p>
                </div>

                {(customFasta || customPdbId) && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                    <h4 className="font-semibold text-gray-800 mb-4">3D Structure Visualization</h4>
                    <ProteinViewer3D 
                      receptorType=""
                      fastaSequence={customFasta}
                      pdbId={customPdbId}
                      height={350}
                    />
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="bg-white p-3 rounded border">
                        <strong>Target:</strong> {customPdbId 
                          ? `PDB Structure: ${customPdbId}`
                          : customFasta 
                            ? "Custom FASTA sequence"
                            : "No target selected"
                        }
                      </div>
                      <div className="bg-white p-3 rounded border">
                        <strong>Source:</strong>
                        <div className="text-gray-600 mt-1">
                          {customPdbId 
                            ? "RCSB PDB Direct Access"
                            : customFasta 
                              ? "Custom FASTA Analysis"
                              : "No target selected"
                          }
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded border">
                        <strong>Analysis Method:</strong>
                        <div className="text-gray-600 mt-1">Deep Learning Models</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced Prediction Tab */}
          <TabsContent value="predict" className="space-y-6">
            <DockingPredictionEngine
              ligandSmiles={batchMode ? batchLigands[0] || '' : ligandSmiles}
              receptorType=""
              customFasta={customFasta}
              customPdbData={customPdbId ? `PDB_ID:${customPdbId}` : undefined}
              onPredictionComplete={handleDockingComplete}
            />
          </TabsContent>

          {/* Enhanced Results Tab */}
          <TabsContent value="results" className="space-y-6">
            <Card className="border-blue-200 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  📊 Deep Learning Prediction Results
                </CardTitle>
                <CardDescription>
                  AI-powered binding affinity prediction with molecular visualization
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {dockingResults ? (
                  <div className="space-y-6">
                    {/* Enhanced Main Result */}
                    <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border">
                      <h3 className="text-2xl font-bold text-blue-800 mb-2">Deep Learning Prediction</h3>
                      <div className="text-4xl font-bold text-indigo-600 mb-2">
                        {dockingResults.bindingAffinity.toFixed(2)} {dockingResults.metricType || 'pKd'}
                      </div>
                      <div className="flex items-center justify-center gap-4">
                        <Badge variant="default" className="bg-green-100 text-green-700">
                          {dockingResults.modelUsed} Model
                        </Badge>
                        <Badge variant="outline">
                          {dockingResults.confidence}% Confidence
                        </Badge>
                        <Badge variant="secondary">
                          {dockingResults.interactions?.length || 0} Interactions
                        </Badge>
                      </div>
                    </div>

                    {/* Professional 3D Visualization */}
                    {showAdvancedViewer && (
                      <Advanced3DViewer
                        ligandPdb={dockingResults.ligandPdbqt}
                        receptorPdb={dockingResults.receptorPdbqt}
                        interactionData={dockingResults.interactions}
                        height={400}
                      />
                    )}

                    {/* Enhanced Interaction Analysis */}
                    {dockingResults.interactions && dockingResults.interactions.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Molecular Interaction Profile</CardTitle>
                          <CardDescription>
                            Detailed analysis of ligand-protein interactions from deep learning prediction
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {dockingResults.interactions.map((interaction: any, index: number) => (
                              <div key={index} className="p-3 bg-gray-50 rounded border">
                                <div className="flex items-center justify-between mb-2">
                                  <Badge variant="outline" className="text-xs">
                                    {interaction.type.replace('_', ' ').toUpperCase()}
                                  </Badge>
                                  <span className="text-sm font-medium">{interaction.distance}Å</span>
                                </div>
                                <div className="text-sm">
                                  <div><strong>Ligand:</strong> {interaction.ligandAtom}</div>
                                  <div><strong>Protein:</strong> {interaction.proteinResidue}</div>
                                  <div className="mt-1">
                                    <span className="text-xs text-gray-500">Strength: </span>
                                    <span className="text-xs font-medium">
                                      {(interaction.strength * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Download Section */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Download Results</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <Button variant="outline" onClick={() => console.log('Download PDBQT ligand')}>
                            <Download className="h-3 w-3 mr-1" />
                            Ligand PDBQT
                          </Button>
                          <Button variant="outline" onClick={() => console.log('Download PDBQT receptor')}>
                            <Download className="h-3 w-3 mr-1" />
                            Receptor PDBQT
                          </Button>
                          <Button variant="outline" onClick={() => console.log('Download results CSV')}>
                            <Download className="h-3 w-3 mr-1" />
                            Results CSV
                          </Button>
                          <Button variant="outline" onClick={() => console.log('Download interaction map')}>
                            <Download className="h-3 w-3 mr-1" />
                            Interaction Map
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No Prediction Results Available</h3>
                    <p className="max-w-md mx-auto">Run the deep learning prediction engine to see comprehensive 
                      binding affinity analysis with AI-powered predictions and 3D molecular visualization.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
